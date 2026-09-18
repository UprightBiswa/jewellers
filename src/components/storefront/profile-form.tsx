"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { updateProfile, type ActionResult } from "@/app/(shop)/account/actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Spinner label="Saving" />
          Saving…
        </>
      ) : (
        "Save changes"
      )}
    </Button>
  );
}

export function ProfileForm({
  initial,
}: {
  initial: { name: string; email: string; phone: string };
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(updateProfile, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message ?? "Saved.");
    else toast.error(state.message);
  }, [state]);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="grid gap-5">
      <Field label="Your name" htmlFor="name" required error={fieldErrors.name}>
        <Input id="name" name="name" defaultValue={initial.name} autoComplete="name" required />
      </Field>

      <Field
        label="Email"
        htmlFor="email"
        hint="Write to us if you need this changed — it is how we find your orders"
      >
        <Input id="email" defaultValue={initial.email} disabled />
      </Field>

      <Field
        label="Phone"
        htmlFor="phone"
        error={fieldErrors.phone}
        hint="For delivery updates on WhatsApp"
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={initial.phone}
          className="tnum"
        />
      </Field>

      <div>
        <SaveButton />
      </div>
    </form>
  );
}
