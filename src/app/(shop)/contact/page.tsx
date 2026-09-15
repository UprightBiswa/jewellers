import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

import { getSettings } from "@/lib/settings";
import { ContactForm } from "@/components/storefront/contact-form";

export const metadata: Metadata = {
  title: "Contact & support",
  description:
    "Questions about an order, a custom size or a design? Call, email or message us on WhatsApp.",
  alternates: { canonical: "/contact" },
};

export const revalidate = 600;

export default async function ContactPage() {
  const { store, shipping, returns } = await getSettings();

  const address = [
    ...store.addressLines,
    [store.city, store.state].filter(Boolean).join(", "),
    store.pincode,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="container-page py-10">
      <header className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.16em] text-gold">We answer ourselves</p>
        <h1 className="mt-2 font-display text-[clamp(1.9rem,5vw,2.8rem)] text-ink">
          Talk to the people who made it
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          No call centre and no ticket number. Messages reach the shop, and we usually reply
          the same day.
        </p>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_340px]">
        <div>
          <h2 className="font-display text-xl text-ink">Send us a message</h2>
          <div className="mt-5">
            <ContactForm />
          </div>
        </div>

        <aside className="grid gap-5 lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <h2 className="font-display text-lg text-ink">The shop</h2>

            <dl className="mt-4 grid gap-4 text-[14.5px]">
              {address ? (
                <div className="flex gap-3">
                  <dt className="sr-only">Address</dt>
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                  <dd className="whitespace-pre-line text-ink-2">{address}</dd>
                </div>
              ) : null}

              {store.phone ? (
                <div className="flex gap-3">
                  <dt className="sr-only">Phone</dt>
                  <Phone className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                  <dd>
                    <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="text-ink-2 hover:text-brand">
                      {store.phone}
                    </a>
                  </dd>
                </div>
              ) : null}

              {store.email ? (
                <div className="flex gap-3">
                  <dt className="sr-only">Email</dt>
                  <Mail className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                  <dd>
                    <a href={`mailto:${store.email}`} className="text-ink-2 hover:text-brand">
                      {store.email}
                    </a>
                  </dd>
                </div>
              ) : null}

              <div className="flex gap-3">
                <dt className="sr-only">Hours</dt>
                <Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                <dd className="text-ink-2">
                  Monday to Saturday, 11am – 8pm
                  <span className="block text-muted">Closed on Sundays and festivals</span>
                </dd>
              </div>
            </dl>

            {store.whatsapp ? (
              <a
                href={`https://wa.me/${store.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 block rounded-lg bg-success px-4 py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Message us on WhatsApp
              </a>
            ) : null}
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-5">
            <h2 className="font-display text-lg text-ink">Quick answers</h2>
            <dl className="mt-3 grid gap-3 text-[14px]">
              <div>
                <dt className="font-medium text-ink">When will my order arrive?</dt>
                <dd className="text-muted">
                  Dispatched in {shipping.dispatchDays}, delivered in about {shipping.deliveryDays}.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Can I return it?</dt>
                <dd className="text-muted">
                  Yes, within {returns.windowDays} days, unworn and in its box.
                  Except {returns.nonReturnable.toLowerCase()}.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Do you make custom pieces?</dt>
                <dd className="text-muted">
                  Yes. Send a photo on WhatsApp and we will quote you a price and a date.
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
