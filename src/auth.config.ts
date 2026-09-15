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
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
