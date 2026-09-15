"use server";

import { z } from "zod";
import { headers } from "next/headers";

import { db } from "@/lib/db";
import {
  createResetToken,
  hashPassword,
  hashResetToken,
  passwordProblems,
} from "@/lib/password";
import { rateLimit } from "@/lib/api/ratelimit";
import { sendMail } from "@/lib/email/send";
import PasswordResetEmail from "@/emails/password-reset";
import WelcomeEmail from "@/emails/welcome";
import { absoluteUrl, PHONE_RE } from "@/lib/utils";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

async function clientKey(scope: string): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  return `${ip}:${scope}`;
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Register                                                                   */
/* -------------------------------------------------------------------------- */

const registerSchema = z.object({
  name: z.string().min(2, "Please enter your name.").max(80),
  email: z.string().email("That does not look like an email address."),
  phone: z
    .string()
    .refine((v) => !v || PHONE_RE.test(v), "That phone number does not look right.")
    .optional(),
  password: z.string().min(8, "Use at least 8 characters."),
});

export async function registerUser(formData: FormData): Promise<ActionResult> {
  const limit = await rateLimit("auth", await clientKey("register"));
  if (!limit.success) {
    return { ok: false, message: "Too many attempts. Please try again in a few minutes." };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  }

  const problems = passwordProblems(parsed.data.password);
  if (problems.length > 0) {
    return {
      ok: false,
      message: "Please choose a stronger password.",
      fieldErrors: { password: problems.join(" ") },
    };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });

  if (existing) {
    // Tell the truth here: hiding it would only make someone try again and
    // again on a form that will never work for them.
    return {
      ok: false,
      message: "An account with that email already exists.",
      fieldErrors: { email: "Try signing in instead, or reset your password." },
    };
  }

  await db.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      phone: parsed.data.phone || null,
      passwordHash: await hashPassword(parsed.data.password),
      role: "CUSTOMER",
    },
  });

  void sendMail({
    to: email,
    subject: "Welcome — your account is ready",
    react: WelcomeEmail({
      name: parsed.data.name.split(" ")[0],
      shopUrl: absoluteUrl("/collections/all"),
      couponCode: "WELCOME10",
    }),
  });

  return { ok: true, message: "Account created. You can sign in now." };
}

/* -------------------------------------------------------------------------- */
/* Forgot password                                                            */
/* -------------------------------------------------------------------------- */

export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const limit = await rateLimit("email", await clientKey("reset-request"));
  if (!limit.success) {
    return { ok: false, message: "We have already sent a link. Please check your inbox." };
  }

  const parsed = z.string().email().safeParse(formData.get("email"));

  // Always the same answer, valid email or not: a reset form must never be a
  // way to find out which addresses have accounts.
  const generic: ActionResult = {
    ok: true,
    message: "If that email has an account, a reset link is on its way.",
  };

  if (!parsed.success) return generic;

  const email = parsed.data.toLowerCase().trim();
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, isActive: true },
  });

  if (!user || !user.isActive) return generic;

  const { token, hashed, expiresAt } = createResetToken();

  // One live token per address; requesting again invalidates the last link.
  await db.passwordResetToken.deleteMany({ where: { email, usedAt: null } });
  await db.passwordResetToken.create({ data: { email, token: hashed, expiresAt } });

  await sendMail({
    to: email,
    subject: "Reset your password",
    react: PasswordResetEmail({
      name: user.name?.split(" ")[0] ?? "there",
      resetUrl: absoluteUrl(`/reset-password?token=${token}`),
      expiresInMinutes: 60,
    }),
  });

  return generic;
}

/* -------------------------------------------------------------------------- */
/* Reset password                                                             */
/* -------------------------------------------------------------------------- */

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Use at least 8 characters."),
});

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const limit = await rateLimit("auth", await clientKey("reset-submit"));
  if (!limit.success) {
    return { ok: false, message: "Too many attempts. Please try again shortly." };
  }

  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  }

  const problems = passwordProblems(parsed.data.password);
  if (problems.length > 0) {
    return {
      ok: false,
      message: "Please choose a stronger password.",
      fieldErrors: { password: problems.join(" ") },
    };
  }

  const record = await db.passwordResetToken.findUnique({
    where: { token: hashResetToken(parsed.data.token) },
    select: { id: true, email: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return {
      ok: false,
      message: "That link has expired or has already been used. Please request a new one.",
    };
  }

  await db.$transaction([
    db.user.update({
      where: { email: record.email },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Every existing session dies with the old password.
    db.session.deleteMany({ where: { user: { email: record.email } } }),
  ]);

  return { ok: true, message: "Password changed. You can sign in with it now." };
}
