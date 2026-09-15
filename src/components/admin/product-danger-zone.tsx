"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { deleteProduct, setProductStatus } from "@/app/admin/actions";

/**
 * Hiding and deleting, kept apart from the form.
 *
 * "Hide" is what the owner almost always means, so it comes first and is one
 * tap. Deleting asks him to type the product name — not to be difficult, but
 * because he will be doing this on a phone with his thumb.
 */
export function ProductDangerZone({
  productId,
  title,
  status,
  timesOrdered,
}: {
  productId: string;
  title: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  timesOrdered: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);

  async function toggleVisible() {
    setPending(true);
    const result = await setProductStatus(productId, status === "ACTIVE" ? "DRAFT" : "ACTIVE");
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message ?? "Updated.");
    router.refresh();
  }

  async function remove() {
    if (typed.trim().toLowerCase() !== title.trim().toLowerCase()) {
      toast.error("The name does not match.");
      return;
    }

    setPending(true);
    const result = await deleteProduct(productId);
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message ?? "Deleted.");
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <section className="max-w-3xl rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <h2 className="font-display text-lg text-ink">Hide or delete</h2>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-line pb-4">
        <div className="flex-1">
          <p className="text-[14.5px] text-ink">
            {status === "ACTIVE" ? "This is on sale right now." : "Customers cannot see this."}
          </p>
          <p className="text-[13px] text-muted">
            Hiding keeps everything — photos, price, stock — and puts it back in one tap.
          </p>
        </div>
        <Button type="button" variant="secondary" disabled={pending} onClick={toggleVisible}>
          {status === "ACTIVE" ? "Hide from shop" : "Put on sale"}
        </Button>
      </div>

      <div className="mt-4">
        {timesOrdered > 0 ? (
          <p className="text-[13px] text-muted">
            This has been ordered {timesOrdered} {timesOrdered === 1 ? "time" : "times"}, so it
            cannot be deleted — old invoices need it. Deleting will archive it instead.
          </p>
        ) : null}

        {!confirming ? (
          <Button
            type="button"
            variant="quiet"
            className="mt-2 px-0 text-danger"
            onClick={() => setConfirming(true)}
          >
            Delete this product
          </Button>
        ) : (
          <div className="mt-3 grid gap-3 rounded-lg bg-danger-soft p-4">
            <p className="text-[14px] text-ink">
              Type <strong className="font-semibold">{title}</strong> to confirm.
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label="Type the product name to confirm deletion"
              className="bg-surface"
            />
            <div className="flex gap-2">
              <Button type="button" variant="danger" disabled={pending} onClick={remove}>
                {pending ? "Deleting…" : "Delete for good"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setConfirming(false);
                  setTyped("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
