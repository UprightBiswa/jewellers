"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";

export function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/collections/all");
  }

  return (
    <form role="search" onSubmit={onSubmit} className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        type="search"
        name="q"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search rings, payal, pendants…"
        aria-label="Search products"
        className="h-10 w-full rounded-full border border-line bg-surface-2 pl-9 pr-4 text-[14.5px] text-ink placeholder:text-muted focus:border-brand focus:bg-surface focus:outline-none focus:ring-3 focus:ring-brand/15"
      />
    </form>
  );
}
