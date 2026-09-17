"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ReceiptText,
  Tag,
  MessageSquare,
  Settings,
  Coins,
  Store,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/storefront/theme-toggle";
import { Mark } from "@/components/brand/logo";
import { SignOutButton } from "@/app/admin/sign-out";

type NavItem = {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  /** Only /admin itself needs an exact match — everything else owns its subtree. */
  exact?: boolean;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Home", Icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", Icon: Package },
  { href: "/admin/orders", label: "Orders", Icon: ReceiptText },
  { href: "/admin/coupons", label: "Offers", Icon: Tag },
  { href: "/admin/messages", label: "Messages", Icon: MessageSquare },
  { href: "/admin/rate", label: "Silver rate", Icon: Coins },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
];

/** The five that fit across the bottom of a phone. */
const MOBILE_NAV = NAV.filter((n) =>
  ["/admin", "/admin/products", "/admin/orders", "/admin/messages", "/admin/settings"].includes(
    n.href,
  ),
);

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  storeName,
  user,
  children,
}: {
  storeName: string;
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[240px_1fr]">
      {/* Sidebar — desktop only */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <Mark className="size-7 shrink-0" />
          <div>
            <p className="font-display text-lg leading-tight text-ink">{storeName}</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Shop admin</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="grid gap-0.5">
            {NAV.map(({ href, label, Icon, exact }) => {
              const active = isActive(pathname, href, exact);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14.5px] transition-colors",
                      active
                        ? "bg-brand-soft font-medium text-brand"
                        : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 border-t border-line pt-4">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14.5px] text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              <Store className="size-[18px] shrink-0" aria-hidden />
              View the shop
            </Link>
          </div>
        </nav>

        <div className="border-t border-line p-3">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-[12px] text-muted">
              {user.role === "OWNER" ? "Owner" : "Staff"} · {user.email}
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 px-1">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        {/* Top bar — mobile only */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
          <p className="flex items-center gap-2 font-display text-[17px] text-ink">
            <Mark className="size-6 shrink-0" />
            {storeName}
          </p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SignOutButton compact />
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-5 lg:px-8 lg:pb-12">{children}</main>

        {/* Bottom tabs — mobile only. The owner runs the shop from here. */}
        <nav
          aria-label="Admin sections"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <ul className="grid grid-cols-5">
            {MOBILE_NAV.map(({ href, label, Icon, exact }) => {
              const active = isActive(pathname, href, exact);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center gap-0.5 py-2.5 text-[11px]",
                      active ? "text-brand" : "text-muted",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
