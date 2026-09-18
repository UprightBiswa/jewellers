import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe half of the auth setup.
 *
 * Middleware runs on the Edge runtime, where Prisma and bcrypt cannot go. So
 * this file holds only what middleware needs — session shape, route rules, and
 * providers that do not touch the database. The Credentials provider and the
 * Prisma adapter live in src/auth.ts, which only ever runs in Node.
 */

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const ADMIN_ROLES = ["OWNER", "STAFF"] as const;

/**
 * The panel needs BOTH a staff role and a session created through the staff
 * door. Signing in on the shop — even as the owner — gives `scope: "store"`,
 * so the two sides stay genuinely separate rather than sharing one session.
 */
export function canOpenPanel(user?: { role?: string; scope?: string } | null): boolean {
  if (!user) return false;
  return ADMIN_ROLES.includes(user.role as "OWNER" | "STAFF") && user.scope === "admin";
}

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: googleEnabled
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : [],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? "CUSTOMER";
        token.phone = (user as { phone?: string | null }).phone ?? null;
        // Google sign-in is a shop door only; it can never open the panel.
        token.scope = (user as { scope?: string }).scope ?? "store";
      }
      // Lets the account page push a name change into the session immediately.
      if (trigger === "update" && session?.name) {
        token.name = session.name as string;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "CUSTOMER";
        session.user.phone = (token.phone as string | null) ?? null;
        session.user.scope = (token.scope as string) ?? "store";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
