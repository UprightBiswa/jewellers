"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ReceiptText,
  Tag,
  MessageSquare,
  Settings,
  Coins,
  Store,
  FolderTree,
  Layers,
  Star,
  Users,
  FileText,
  Images,
  Menu,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Mark } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";

type NavItem = {
  /** Heading this sits under in the sidebar. Empty means no heading. */
  group?: string;
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  /** Only /admin itself needs an exact match — everything else owns its subtree. */
  exact?: boolean;
};

/**
 * Grouped, because a flat list of twelve is a list nobody reads. The headings
 * match how Rahul thinks about the shop rather than how the database is built:
 * the things he sells, the people who buy them, and the words around both.
 */
const NAV: NavItem[] = [
  { href: "/admin", label: "Home", Icon: LayoutDashboard, exact: true, group: "" },

  { href: "/admin/products", label: "Products", Icon: Package, group: "The shop" },
  { href: "/admin/categories", label: "Categories", Icon: FolderTree, group: "The shop" },
  { href: "/admin/collections", label: "Collections", Icon: Layers, group: "The shop" },
  { href: "/admin/rate", label: "Silver rate", Icon: Coins, group: "The shop" },

  { href: "/admin/orders", label: "Orders", Icon: ReceiptText, group: "People" },
  { href: "/admin/customers", label: "Customers", Icon: Users, group: "People" },
  { href: "/admin/reviews", label: "Reviews", Icon: Star, group: "People" },
  { href: "/admin/messages", label: "Messages", Icon: MessageSquare, group: "People" },

  { href: "/admin/homepage", label: "Front page", Icon: Images, group: "Words and rules" },
  { href: "/admin/pages", label: "Pages", Icon: FileText, group: "Words and rules" },
  { href: "/admin/coupons", label: "Offers", Icon: Tag, group: "Words and rules" },
  { href: "/admin/settings", label: "Settings", Icon: Settings, group: "Words and rules" },
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
  const [drawer, setDrawer] = useState(false);

  // Close when the route changes, or tapping a link leaves the drawer open over
  // the page it just went to.
  useEffect(() => setDrawer(false), [pathname]);

  // A drawer over a page that still scrolls behind it feels broken on a phone.
  useEffect(() => {
    if (!drawer) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawer]);

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
            {NAV.map(({ href, label, Icon, exact, group }, i) => {
              const active = isActive(pathname, href, exact);
              // A heading appears once, above the first item that carries it.
              const newGroup = group && group !== NAV[i - 1]?.group;
              return (
                <li key={href}>
                  {newGroup && (
                    <p className="px-3 pt-4 pb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                      {group}
                    </p>
                  )}
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
            <SignOutButton redirectTo={"/admin/login"} />
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        {/* Top bar — mobile only */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="-ms-2 rounded-lg p-2 text-ink-2 hover:bg-surface-2 hover:text-ink"
            aria-label="Open the menu"
            aria-expanded={drawer}
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <p className="flex min-w-0 items-center gap-2 font-display text-[17px] text-ink">
            <Mark className="size-6 shrink-0" />
            <span className="truncate">{storeName}</span>
          </p>

          <div className="flex items-center gap-1">
            <SignOutButton compact redirectTo={"/admin/login"} />
          </div>
        </header>

        {/* The whole menu on a phone.
            The bottom tabs hold five destinations and there are twelve, so
            Categories, Reviews, Customers, the front page and the rest were
            simply unreachable from a phone — on a panel whose first rule is that
            it must work from one. */}
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button
              type="button"
              className="absolute inset-0 bg-ink/40"
              onClick={() => setDrawer(false)}
              aria-label="Close the menu"
            />
            <div className="absolute inset-y-0 start-0 flex w-[82%] max-w-xs flex-col border-e border-line bg-surface motion-safe:animate-[drawer-in_200ms_ease-out]">
              <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
                <p className="flex items-center gap-2 font-display text-[17px] text-ink">
                  <Mark className="size-6 shrink-0" />
                  {storeName}
                </p>
                <button
                  type="button"
                  onClick={() => setDrawer(false)}
                  className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                  aria-label="Close"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-3">
                <ul className="grid gap-0.5">
                  {NAV.map(({ href, label, Icon, exact, group }, i) => {
                    const active = isActive(pathname, href, exact);
                    const newGroup = group && group !== NAV[i - 1]?.group;
                    return (
                      <li key={href}>
                        {newGroup && (
                          <p className="px-3 pt-4 pb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                            {group}
                          </p>
                        )}
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] transition-colors",
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
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] text-ink-2 hover:bg-surface-2 hover:text-ink"
                  >
                    <Store className="size-[18px] shrink-0" aria-hidden />
                    View the shop
                  </Link>
                </div>
              </nav>

              <div className="border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                <p className="truncate text-[12px] text-muted">
                  {user.role === "OWNER" ? "Owner" : "Staff"} · {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

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
