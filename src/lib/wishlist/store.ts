"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Which pieces this customer has saved.
 *
 * Loaded once per page and shared by every heart on it, so a grid of twenty
 * products costs one request rather than twenty. Toggling is optimistic — the
 * heart fills on tap and only rolls back if the server disagrees.
 */

type State = {
  ids: Set<string>;
  signedIn: boolean;
  loaded: boolean;
};

let state: State = { ids: new Set(), signedIn: false, loaded: false };
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function emit(next: State) {
  state = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverSnapshot = (): State => ({ ids: new Set(), signedIn: false, loaded: false });

async function load() {
  if (loading) return loading;

  loading = (async () => {
    try {
      const res = await fetch("/api/v1/wishlist", { credentials: "same-origin" });
      const json = await res.json();
      if (json?.ok) {
        emit({
          ids: new Set<string>(json.data.productIds),
          signedIn: Boolean(json.data.signedIn),
          loaded: true,
        });
      } else {
        emit({ ...state, loaded: true });
      }
    } catch {
      emit({ ...state, loaded: true });
    } finally {
      loading = null;
    }
  })();

  return loading;
}

export const wishlist = {
  /** Returns the new saved state, or throws with a message worth showing. */
  async toggle(productId: string): Promise<boolean> {
    const was = state.ids.has(productId);
    const optimistic = new Set(state.ids);
    if (was) optimistic.delete(productId);
    else optimistic.add(productId);
    emit({ ...state, ids: optimistic });

    try {
      const res = await fetch("/api/v1/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ productId }),
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        emit({ ...state, ids: new Set(state.ids).add(productId) });
        // Put it back the way it was before throwing.
        const reverted = new Set(state.ids);
        if (was) reverted.add(productId);
        else reverted.delete(productId);
        emit({ ...state, ids: reverted });
        throw new Error(json?.error?.message ?? "Could not save that.");
      }

      return Boolean(json.data.saved);
    } catch (err) {
      throw err instanceof Error ? err : new Error("Could not save that.");
    }
  },
};

export function useWishlist() {
  const snapshot = useSyncExternalStore(subscribe, () => state, serverSnapshot);

  useEffect(() => {
    if (!state.loaded) void load();
  }, []);

  return snapshot;
}
