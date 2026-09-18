import type { Metadata, Viewport } from "next";
import { Marcellus, Manrope, Noto_Sans_Bengali } from "next/font/google";
import { Toaster } from "sonner";

import { getSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/site-url";

import "./globals.css";

const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marcellus",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-bengali",
  display: "swap",
});

const siteUrl = SITE_URL;

/**
 * Titles and descriptions come from Settings, so the owner renaming his shop in
 * the admin renames it in the browser tab, in search results and on every
 * shared link — without a deploy.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { store } = await getSettings();
  const place = [store.city, store.state].filter(Boolean).join(", ");

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${store.name} — Handmade 925 Silver${place ? ` in ${place}` : ""}`,
      template: `%s · ${store.name}`,
    },
    description:
      `${store.tagline}. Earrings, rings, chains, bracelets, payel, toe rings and baby ` +
      `sets in 925 silver, made by hand${place ? ` in ${place}` : ""} and shipped across India.`,
    applicationName: store.name,
    keywords: [
      "silver jewellery", "925 silver", "rupor gohona", "silver payel",
      "silver anklet", "silver earrings", "jhumka", "toe ring", "baby silver set",
      "silver jewellery Coochbehar", "silver shop Tufanganj", "buy silver online India",
    ],
    authors: [{ name: store.name }],
    openGraph: {
      type: "website",
      locale: "en_IN",
      alternateLocale: "bn_IN",
      siteName: store.name,
      url: siteUrl,
      title: `${store.name} — Handmade 925 Silver`,
      description: store.tagline,
    },
    twitter: { card: "summary_large_image", title: store.name, description: store.tagline },
    robots: { index: true, follow: true },
    formatDetection: { telephone: true, address: false, email: false },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Light only — see globals.css.
  themeColor: "#f5f6f8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${marcellus.variable} ${manrope.variable} ${notoBengali.variable}`}
    >
      <body className="min-h-dvh bg-bg text-ink antialiased">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "var(--color-surface)",
              color: "var(--color-ink)",
              border: "1px solid var(--color-line)",
            },
          }}
        />
      </body>
    </html>
  );
}
