import type { Metadata } from "next";
import { Suspense } from "react";
import { features } from "@/lib/env";
import { RegisterForm } from "@/components/auth/forms";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

/**
 * Rendered per request, not at build time.
 *
 * Whether the Google button appears depends on AUTH_GOOGLE_ID, which is runtime
 * configuration. Prerendered, the answer is frozen at whatever the build machine
 * happened to know — so adding the credentials to Vercel after the first deploy
 * left a shop that reported googleAuth: true on /api/v1/health while serving a
 * sign-in page with no Google button on it, until something forced a rebuild.
 */
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm googleEnabled={features.googleAuth} />
    </Suspense>
  );
}
