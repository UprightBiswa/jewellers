"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Client-side cart mirror.
 *
 * The server cart in Postgres is the record of truth — it survives a device
 * change and is what checkout reads. This store exists so the badge and the
 * cart drawer update the instant someone taps "Add", without waiting for a
 * round trip. Every mutation posts to /api/v1/cart and reconciles with the
 * server's answer.
 */

export type CartLine = {
  id: string;
  productId: string;
  variantId: string | null;
  slug: string;
  title: string;
  variantLabel: string | null;
  image: string | null;
  unitPrice: number;
  qty: number;
  maxQty: number;
};

export type CartState = {
  lines: CartLine[];
  subtotal: number;
  count: number;
  status: "idle" | "loading" | "error";
};

const EMPTY: CartState = { lines: [], subtotal: 0, count: 0, status: "idle" };

let state: CartState = EMPTY;
const listeners = new Set<() => void>();

function emit(next: CartState) {
  state = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function derive(lines: CartLine[]): CartState {
  return {
    lines,
    subtotal: lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
    count: lines.reduce((sum, l) => sum + l.qty, 0),
    status: "idle",
  };
}

async function call(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<CartLine[]> {
  const res = await fetch("/api/v1/cart", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error?.message ?? "Could not update your bag.");
  }
  return json.data.lines as CartLine[];
}

export const cart = {
  async load() {
    try {
      emit({ ...state, status: "loading" });
      emit(derive(await call("GET")));
    } catch {
      emit({ ...state, status: "error" });
    }
  },

  async add(input: { productId: string; variantId?: string | null; qty?: number }) {
    const lines = await call("POST", { ...input, qty: input.qty ?? 1 });
    emit(derive(lines));
  },

  async setQty(lineId: string, qty: number) {
    // Optimistic: the number in the stepper must not lag the tap.
    emit(
      derive(
        state.lines
          .map((l) => (l.id === lineId ? { ...l, qty } : l))
          .filter((l) => l.qty > 0),
      ),
    );
    try {
      emit(derive(await call("PATCH", { lineId, qty })));
    } catch {
      await cart.load();
    }
  },

  async remove(lineId: string) {
    emit(derive(state.lines.filter((l) => l.id !== lineId)));
    try {
      emit(derive(await call("DELETE", { lineId })));
    } catch {
      await cart.load();
    }
  },
};

const serverSnapshot = () => EMPTY;

export function useCart(): CartState {
  const snapshot = useSyncExternalStore(subscribe, () => state, serverSnapshot);

  useEffect(() => {
    if (state === EMPTY) void cart.load();
  }, []);

  return snapshot;
}

export function useAddToCart() {
  return useCallback(
    (input: { productId: string; variantId?: string | null; qty?: number }) => cart.add(input),
    [],
  );
}
