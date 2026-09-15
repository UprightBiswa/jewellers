"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { addShipment, updateOrderStatus } from "@/app/admin/actions";
import type { OrderStatus } from "@/generated/prisma";

const COURIERS = ["India Post", "Delhivery", "DTDC", "Blue Dart", "Shiprocket", "Local delivery"];

/**
 * The one control the owner uses most: move the order to its next state.
 *
 * It shows the single next step rather than a list of every status, because on
 * a phone, between packing two parcels, "Mark as packed" is a decision and a
 * dropdown of seven states is a puzzle.
 */
export function OrderActions({
  orderId,
  status,
  hasShipment,
}: {
  orderId: string;
  status: OrderStatus;
  hasShipment: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [courier, setCourier] = useState(COURIERS[0] ?? "");
  const [awb, setAwb] = useState("");

  async function move(next: OrderStatus) {
    setPending(true);
    const result = await updateOrderStatus(orderId, next);
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message ?? "Updated.");
    router.refresh();
  }

  async function ship() {
    setPending(true);
    const result = await addShipment({ orderId, courier, awb: awb || undefined });
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message ?? "Marked as shipped.");
    setShipping(false);
    router.refresh();
  }

  const nextStep: { label: string; to: OrderStatus } | null =
    status === "PENDING"
      ? { label: "Mark as paid and confirmed", to: "CONFIRMED" }
      : status === "CONFIRMED"
        ? { label: "Mark as packed", to: "PACKED" }
        : status === "SHIPPED"
          ? { label: "Mark as delivered", to: "DELIVERED" }
          : null;

  const canShip = status === "PACKED" || (status === "CONFIRMED" && hasShipment);

  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        {nextStep ? (
          <Button type="button" disabled={pending} onClick={() => move(nextStep.to)}>
            {pending ? "Saving…" : nextStep.label}
          </Button>
        ) : null}

        {canShip && !shipping ? (
          <Button type="button" variant="secondary" onClick={() => setShipping(true)}>
            Add tracking and mark shipped
          </Button>
        ) : null}

        {status !== "CANCELLED" && status !== "DELIVERED" && status !== "RETURNED" ? (
          <Button
            type="button"
            variant="quiet"
            disabled={pending}
            className="text-danger"
            onClick={() => {
              if (confirm("Cancel this order? The customer is not refunded automatically.")) {
                void move("CANCELLED");
              }
            }}
          >
            Cancel order
          </Button>
        ) : null}

        {status === "DELIVERED" ? (
          <p className="text-sm text-success">Delivered. Nothing left to do.</p>
        ) : null}
      </div>

      {shipping ? (
        <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Courier" htmlFor="courier">
            <Select id="courier" value={courier} onChange={(e) => setCourier(e.target.value)}>
              {COURIERS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>

          <Field label="Tracking number" htmlFor="awb" hint="Optional">
            <Input
              id="awb"
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
              className="tnum"
            />
          </Field>

          <div className="flex gap-2">
            <Button type="button" disabled={pending} onClick={ship}>
              {pending ? "Saving…" : "Mark shipped"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShipping(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
