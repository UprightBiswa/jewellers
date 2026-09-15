import type { Metadata } from "next";
import { Suspense } from "react";
import { features } from "@/lib/env";
import { LoginForm } from "@/components/auth/forms";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm googleEnabled={features.googleAuth} />
    </Suspense>
  );
}
