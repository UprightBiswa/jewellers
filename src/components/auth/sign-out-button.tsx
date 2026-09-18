"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import { signOutAction } from "@/app/(auth)/actions";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Sign out, as a form posting to a server action.
 *
 * The client `signOut()` helper depends on JavaScript having loaded and a fetch
 * resolving before it redirects; when either is slow the button looks dead,
 * which is what was reported. A form posts regardless, shows a real pending
 * state, and still works with JavaScript switched off.
 */
function Inner({ compact }: { compact: boolean }) {
  const { pending } = useFormStatus();

  if (compact) {
    return (
      <button
        type="submit"
        disabled={pending}
        aria-label="Sign out"
        className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
      >
        {pending ? <Spinner label="Signing out" /> : <LogOut className="size-4" aria-hidden />}
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
        "text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50",
      )}
    >
      {pending ? <Spinner label="Signing out" /> : <LogOut className="size-3.5" aria-hidden />}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function SignOutButton({
  compact = false,
  redirectTo = "/",
}: {
  compact?: boolean;
  redirectTo?: string;
}) {
  return (
    <form action={signOutAction}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Inner compact={compact} />
    </form>
  );
}
