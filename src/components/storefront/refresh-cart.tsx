"use client";

import { useEffect } from "react";
import { cart } from "@/lib/cart/store";

/**
 * Re-reads the bag after the server emptied it.
 *
 * The cart store lives in module scope and survives client navigation, so
 * without this the header badge would still show items the customer has already
 * bought. Rendered on the order-success page only.
 */
export function RefreshCart() {
  useEffect(() => {
    void cart.load();
  }, []);

  return null;
}
