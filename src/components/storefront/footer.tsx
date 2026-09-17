import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { FacebookIcon, InstagramIcon, YoutubeIcon } from "./social-icons";

import { listCategories } from "@/lib/queries/catalog";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/brand/logo";
import { NewsletterForm } from "./newsletter-form";

const HELP_LINKS = [
  ["/contact", "Contact & support"],
  ["/account/orders", "Track your order"],
  ["/pages/shipping-policy", "Shipping & delivery"],
  ["/pages/returns-policy", "Returns & exchange"],
  ["/pages/about", "About us"],
] as const;

const LEGAL_LINKS = [
  ["/pages/terms", "Terms & conditions"],
  ["/pages/privacy-policy", "Privacy policy"],
] as const;

export async function Footer() {
  const [settings, categories] = await Promise.all([getSettings(), listCategories()]);
  const { store, social, shipping, returns } = settings;

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      {/* Trust strip — the three things a silver buyer actually checks */}
      <div className="border-b border-line">
        <div className="container-page grid gap-px sm:grid-cols-3">
          {[
            ["925 & 999 silver", "Hallmarked where marked, tested always"],
            [shipping.shipsTo, `Dispatch in ${shipping.dispatchDays}`],
            [`${returns.windowDays}-day returns`, returns.buyback],
          ].map(([title, sub]) => (
            <div key={title} className="py-6 text-center sm:px-6">
              <p className="font-display text-[17px] text-ink">{title}</p>
              <p className="mt-0.5 text-[13px] text-muted">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo storeName={store.name} markClassName="size-9" />
          <p className="mt-2 text-sm text-muted">{store.tagline}</p>

          <address className="mt-5 grid gap-2.5 not-italic text-sm text-ink-2">
            {store.addressLines.length > 0 ? (
              <span className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                <span>
                  {store.addressLines.join(", ")}
                  {store.city ? <>, {store.city}</> : null}
                  {store.state ? <>, {store.state}</> : null}
                  {store.pincode ? <> {store.pincode}</> : null}
                </span>
              </span>
            ) : null}

            {store.phone ? (
              <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="flex items-center gap-2.5 hover:text-brand">
                <Phone className="size-4 shrink-0 text-muted" aria-hidden />
                {store.phone}
              </a>
            ) : null}

            {store.email ? (
              <a href={`mailto:${store.email}`} className="flex items-center gap-2.5 hover:text-brand">
                <Mail className="size-4 shrink-0 text-muted" aria-hidden />
                {store.email}
              </a>
            ) : null}
          </address>

          <div className="mt-5 flex gap-2">
            {social.instagram ? (
              <a href={social.instagram} target="_blank" rel="noopener noreferrer"
                aria-label="Instagram"
                className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors hover:border-brand hover:text-brand">
                <InstagramIcon className="size-4" aria-hidden />
              </a>
            ) : null}
            {social.facebook ? (
              <a href={social.facebook} target="_blank" rel="noopener noreferrer"
                aria-label="Facebook"
                className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors hover:border-brand hover:text-brand">
                <FacebookIcon className="size-4" aria-hidden />
              </a>
            ) : null}
            {social.youtube ? (
              <a href={social.youtube} target="_blank" rel="noopener noreferrer"
                aria-label="YouTube"
                className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors hover:border-brand hover:text-brand">
                <YoutubeIcon className="size-4" aria-hidden />
              </a>
            ) : null}
          </div>
        </div>

        <nav aria-label="Shop" className="lg:col-span-3">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-muted">Shop</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm lg:grid-cols-1">
            {categories.slice(0, 10).map((c) => (
              <li key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="text-ink-2 hover:text-brand">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Help" className="lg:col-span-2">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-muted">Help</h2>
          <ul className="mt-4 grid gap-2 text-sm">
            {HELP_LINKS.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-ink-2 hover:text-brand">{label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-muted">Stay in touch</h2>
          <p className="mt-4 text-sm text-ink-2">
            New designs and festival offers. Two or three emails a month, never more.
          </p>
          <NewsletterForm className="mt-4" />
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-muted">
            © {new Date().getFullYear()} {store.name}
            {store.sinceYear ? ` · Making silver since ${store.sinceYear}` : null}
          </p>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            {LEGAL_LINKS.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-muted hover:text-ink">{label}</Link>
              </li>
            ))}
          </ul>

          <p className="text-[12px] text-muted">UPI · Cards · Net banking · COD</p>
        </div>
      </div>
    </footer>
  );
}
