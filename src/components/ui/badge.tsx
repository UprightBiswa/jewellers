import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

const badge = cva(
  "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface-2 text-ink-2",
        brand: "bg-brand-soft text-brand",
        gold: "bg-gold-soft text-gold",
        success: "bg-success-soft text-success",
        warn: "bg-warn-soft text-warn",
        danger: "bg-danger-soft text-danger",
        solid: "bg-brand text-on-brand",
      },
      size: {
        xs: "px-2 py-0.5 text-[11px] tracking-wide",
        sm: "px-2.5 py-1 text-xs",
        md: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export function Badge({
  className,
  tone,
  size,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone, size }), className)} {...props} />;
}

/**
 * Order and payment states, mapped to a tone once so the same status never
 * shows up amber on one screen and grey on another.
 */
export const ORDER_TONE = {
  PENDING: "warn",
  CONFIRMED: "brand",
  PACKED: "brand",
  SHIPPED: "brand",
  DELIVERED: "success",
  CANCELLED: "neutral",
  RETURNED: "danger",
} as const;

export const PAYMENT_TONE = {
  PENDING: "warn",
  PAID: "success",
  FAILED: "danger",
  REFUNDED: "neutral",
  COD_PENDING: "warn",
} as const;

export const ORDER_LABEL = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
} as const;

export const PAYMENT_LABEL = {
  PENDING: "Unpaid",
  PAID: "Paid",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
  COD_PENDING: "Cash on delivery",
} as const;
