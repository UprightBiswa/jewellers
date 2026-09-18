import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { authConfig, ADMIN_ROLES } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  /** "admin" locks the attempt to staff accounts on the separate admin route */
  scope: z.enum(["store", "admin"]).default("store"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),

  providers: [
    ...authConfig.providers,

    Credentials({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        scope: { label: "Scope", type: "text" },
      },

      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password, scope } = parsed.data;

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            phone: true,
            role: true,
            isActive: true,
            passwordHash: true,
          },
        });

        // Same answer whether the account is missing, disabled, Google-only or
        // the password is wrong — a login form must not confirm which emails exist.
        if (!user?.passwordHash || !user.isActive) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        // The admin form can only sign in staff; the store form can only sign
        // in through /login. Staff signing into the storefront is allowed.
        if (scope === "admin" && !ADMIN_ROLES.includes(user.role as "OWNER" | "STAFF")) {
          return null;
        }

        await db.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => undefined);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          phone: user.phone,
          // Which door they came through. The panel requires "admin", so a staff
          // member who signs in on the shop gets a shop session and nothing more.
          scope,
        };
      },
    }),
  ],

  events: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.id) {
        await db.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => undefined);
      }
    },
  },
});

/** Throws-free helpers used across server components and route handlers. */
export async function currentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireAdmin() {
  const user = await currentUser();
  if (!user || !ADMIN_ROLES.includes(user.role as "OWNER" | "STAFF")) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function isAdminRole(role?: string | null): boolean {
  return ADMIN_ROLES.includes(role as "OWNER" | "STAFF");
}
