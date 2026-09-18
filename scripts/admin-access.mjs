/**
 * Everything needed to get into the admin panel, in one place.
 *
 *   npm run admin                  show the door URL, the login URL and who can sign in
 *   npm run admin -- --reset       set a new owner password and print it once
 *
 * None of this lives in an environment variable any more. The door is derived
 * from AUTH_SECRET (see src/config/admin.ts), and the accounts live in Neon.
 * The summary is also written to ADMIN-ACCESS.local.txt, which .gitignore keeps
 * out of every commit — so it is readable on this machine and nowhere else.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });

import { createHash, randomInt } from "node:crypto";
import { writeFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import pg from "pg";

const OUT_FILE = "ADMIN-ACCESS.local.txt";
const reset = process.argv.includes("--reset") || process.argv.includes("--reset-password");

/** `npm run admin -- --email rahul@example.com` changes the owner's sign-in address. */
const emailFlag = process.argv.indexOf("--email");
const newEmail = emailFlag !== -1 ? process.argv[emailFlag + 1]?.trim().toLowerCase() : null;

/**
 * `npm run admin -- --password "…"` sets a chosen password instead of a
 * generated one. It is read from the command line and hashed immediately — it is
 * never written to a file, and nothing in this repository contains it.
 */
const passwordFlag = process.argv.indexOf("--password");
const chosenPassword = passwordFlag !== -1 ? process.argv[passwordFlag + 1] : null;

/** The same derivation as src/config/admin.ts. Keep the two in step. */
function adminDoor() {
  const authSecret = process.env.AUTH_SECRET?.trim();
  if (!authSecret) return "";
  return createHash("sha256")
    .update(`charubala:admin-door:${authSecret}`)
    .digest("hex")
    .slice(0, 16);
}

/** Readable on a phone screen: no 0/O, no 1/l/I. */
function newPassword() {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const caps = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (set, n) => Array.from({ length: n }, () => set[randomInt(set.length)]).join("");
  return `${pick(caps, 1)}${pick(letters, 4)}-${pick(letters, 4)}-${pick(digits, 3)}`;
}

const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const door = adminDoor();

const lines = [];
const say = (s = "") => {
  lines.push(s);
  console.log(s);
};

say("");
say("  Charubala Silver — admin access");
say("  " + "-".repeat(46));
say("");

if (!door) {
  say("  AUTH_SECRET is not set, so there is no secret door.");
  say("  /admin is reachable directly. Set AUTH_SECRET to turn the door on.");
  say("");
  say(`  Sign in:   ${origin}/admin/login`);
} else {
  say("  Give Rahul this link. It is the only way in — typing /admin");
  say("  without visiting it first returns a 404.");
  say("");
  say(`  Admin door:  ${origin}/${door}`);
  say(`  Then signs in at:  ${origin}/admin/login`);
}

say("");

// --- accounts ---------------------------------------------------------------

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!url) {
  say("  No DATABASE_URL — cannot list the staff accounts.");
} else {
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();

    // Act on whichever OWNER account actually exists, rather than assuming an
    // address — the seeded one and the one Rahul reads mail at need not match.
    const owners = await client.query(
      `SELECT id, email FROM "User" WHERE role = 'OWNER' ORDER BY "createdAt" LIMIT 2`,
    );
    const owner = owners.rows[0] ?? null;

    const changingPassword = reset || Boolean(chosenPassword);

    if ((changingPassword || newEmail) && !owner) {
      say("  There is no owner account yet. Run: npm run db:seed");
      say("");
    } else if (owners.rowCount > 1) {
      say("  More than one OWNER account exists — refusing to guess which to change.");
      say("  Disable the spare one in the panel first.");
      say("");
    } else {
      if (newEmail) {
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) {
          say(`  "${newEmail}" is not an email address.`);
        } else {
          await client.query(
            `UPDATE "User" SET email = $1, "updatedAt" = now() WHERE id = $2`,
            [newEmail, owner.id],
          );
          say(`  Sign-in address changed: ${owner.email} → ${newEmail}`);
          owner.email = newEmail;
        }
        say("");
      }

      if (changingPassword) {
        const password = chosenPassword ?? newPassword();

        if (password.length < 8) {
          say("  That password is under 8 characters — the sign-in form rejects it.");
          throw new Error("password too short");
        }

        const hash = await bcrypt.hash(password, 12);
        await client.query(
          `UPDATE "User" SET "passwordHash" = $1, "updatedAt" = now() WHERE id = $2`,
          [hash, owner.id],
        );

        say(chosenPassword ? "  Password set." : "  Password reset.");
        say("");
        say(`  Email:     ${owner.email}`);
        say(`  Password:  ${password}`);
        say("");
        say("  Stored only as a bcrypt hash. Nothing in the repository holds it.");
        say("");
      }
    }

    const staff = await client.query(
      `SELECT email, name, role, "isActive", "lastLoginAt"
         FROM "User" WHERE role IN ('OWNER', 'STAFF') ORDER BY role, email`,
    );

    if (staff.rowCount === 0) {
      say("  No staff accounts yet. Run: npm run db:seed");
    } else {
      say("  Who can open the panel:");
      say("");
      for (const u of staff.rows) {
        const last = u.lastLoginAt
          ? new Date(u.lastLoginAt).toISOString().slice(0, 16).replace("T", " ")
          : "never";
        say(`    ${u.role.padEnd(6)}  ${u.email}${u.isActive ? "" : "  (disabled)"}`);
        say(`            ${u.name ?? "—"} · last signed in: ${last}`);
      }
      say("");
      say("  Forgotten the password?   npm run admin -- --reset");
      say("  Choose one yourself?      npm run admin -- --password \"…\"");
      say("  Wrong sign-in address?    npm run admin -- --email you@example.com");
    }
  } catch (err) {
    say(`  Could not reach the database: ${err.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}

say("");
say("  Customers never see any of this. The shop's own sign-in is at");
say(`  ${origin}/login and cannot open the panel, whatever the role —`);
say("  a staff session is only created through the admin form.");
say("");

writeFileSync(OUT_FILE, lines.join("\n") + "\n", "utf8");
console.log(`  (also written to ${OUT_FILE} — git-ignored)\n`);
