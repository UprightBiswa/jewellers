"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MapPin, Package, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/sign-out-button";

type AccountLink = {
  href: string;
  label: string;
  Icon: typeof User;
  /** Only /account itself matches exactly; the rest own their subtree. */
  exact?: boolean;
};

const LINKS: AccountLink[] = [
  { href: "/account", label: "Profile", Icon: User, exact: true },
  { href: "/account/orders", label: "Orders", Icon: Package },
  { href: "/account/addresses", label: "Addresses", Icon: MapPin },
  { href: "/account/wishlist", label: "Saved", Icon: Heart },
];

/**
 * Account navigation: a scrolling row of pills on a phone, a column on a
 * desktop. Same pattern as the admin's bottom tabs — on a small screen a
 * vertical sidebar just pushes the actual content off the first screen.
 */
export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account sections" className="lg:sticky lg:top-28 lg:self-start">
      <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:grid lg:gap-1 lg:px-0">
        {LINKS.map(({ href, label, Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-full px-3.5 py-2 text-[14.5px] transition-colors lg:rounded-lg lg:px-3",
                  active
                    ? "bg-brand-soft font-medium text-brand"
                    : "border border-line text-ink-2 hover:text-ink lg:border-0 lg:hover:bg-surface-2",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 hidden border-t border-line pt-4 lg:block">
        <SignOutButton redirectTo={"/"} />
      </div>
    </nav>
  );
}
