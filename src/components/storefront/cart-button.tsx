"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart/store";

export function CartButton() {
  const { count } = useCart();

  return (
    <Link
      href="/cart"
      className="relative grid size-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
      aria-label={count > 0 ? `Bag, ${count} item${count === 1 ? "" : "s"}` : "Bag, empty"}
    >
      <ShoppingBag className="size-[19px]" aria-hidden />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold text-on-brand tnum">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
