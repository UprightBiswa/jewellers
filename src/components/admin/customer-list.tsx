"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Ban, ChevronDown, MapPin, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setCustomerActive } from "@/app/admin/content-actions";

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  joined: string;
  lastSeen: string;
  orderCount: number;
  addressCount: number;
  reviewCount: number;
  spent: string;
  place: string | null;
};

/**
 * Who has bought from the shop.
 *
 * There is no delete. Removing a customer would leave their orders pointing at
 * nobody, and those orders are the shop's records. Disabling stops the sign-in
 * and keeps the history whole, which is what "remove this person" almost always
 * means in practice.
 *
 * Each row opens to show the detail rather than navigating: on a phone, going
 * back and forth to see a phone number is the slowest thing in the panel.
 */
export function CustomerList({ customers }: { customers: CustomerRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleActive(c: CustomerRow) {
    startTransition(async () => {
      const res = await setCustomerActive(c.id, !c.isActive);
      res.ok ? toast.success(res.message ?? "Done.") : toast.error(res.message);
    });
  }

  if (customers.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-line py-16 text-center">
        <p className="font-display text-lg text-ink">Nobody yet</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
          Accounts appear here as people register. Guest orders show on the order itself.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
      {customers.map((c) => {
        const expanded = open === c.id;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : c.id)}
              aria-expanded={expanded}
              className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-surface-2"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-[15px] font-medium text-ink">
                  {c.name}
                  {!c.isActive && (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-normal text-muted">
                      Cannot sign in
                    </span>
                  )}
                </p>
                <p className="truncate text-[12.5px] text-muted">
                  {c.email}
                  {c.phone ? ` · ${c.phone}` : ""}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[15px] font-semibold text-ink tnum">{c.spent}</p>
                <p className="text-[12.5px] text-muted tnum">
                  {c.orderCount} {c.orderCount === 1 ? "order" : "orders"}
                </p>
              </div>

              <ChevronDown
                className={cn("size-4 shrink-0 text-muted transition-transform", expanded && "rotate-180")}
                aria-hidden
              />
            </button>

            {expanded && (
              <div className="grid gap-3 border-t border-line bg-surface-2/40 p-4">
                <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
                  <Fact label="Joined" value={c.joined} />
                  <Fact label="Last signed in" value={c.lastSeen} />
                  <Fact label="Saved addresses" value={String(c.addressCount)} />
                  <Fact label="Reviews written" value={String(c.reviewCount)} />
                </dl>

                {c.place && (
                  <p className="flex items-center gap-1.5 text-[13px] text-muted">
                    <MapPin className="size-3.5" aria-hidden />
                    {c.place}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {c.orderCount > 0 && (
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/admin/orders?q=${encodeURIComponent(c.email)}`}>
                        See their orders
                      </Link>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={c.isActive ? "danger" : "secondary"}
                    disabled={pending}
                    onClick={() => toggleActive(c)}
                  >
                    {c.isActive ? (
                      <>
                        <Ban className="size-4" aria-hidden />
                        Stop them signing in
                      </>
                    ) : (
                      <>
                        <Undo2 className="size-4" aria-hidden />
                        Let them sign in again
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-[12.5px] text-muted">
                  Accounts are never deleted — their past orders are the shop&rsquo;s own records.
                </p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}
