import type { Metadata } from "next";
import { Suspense } from "react";
import { features } from "@/lib/env";
import { RegisterForm } from "@/components/auth/forms";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm googleEnabled={features.googleAuth} />
    </Suspense>
  );
}
