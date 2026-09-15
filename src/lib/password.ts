import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Password reset tokens: the raw token goes in the email link, only its digest
 * is stored. A leaked database therefore cannot be used to reset anyone.
 */
export function createResetToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    hashed: createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // one hour
  };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Deliberately mild: length beats character classes for real-world safety. */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 8) problems.push("Use at least 8 characters.");
  if (!/[a-zA-Z]/.test(password)) problems.push("Include at least one letter.");
  if (!/[0-9]/.test(password)) problems.push("Include at least one number.");
  if (/^(password|12345678|qwerty)/i.test(password)) problems.push("That password is too common.");
  return problems;
}
