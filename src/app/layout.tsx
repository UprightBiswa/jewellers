import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { getSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/site-url";

import "./globals.css";

const marcellus = localFont({
  src: [{ path: "../../public/fonts/marcellus-400.woff2", weight: "400", style: "normal" }],
  variable: "--font-marcellus",
  display: "swap",
});

const manrope = localFont({
  src: [
    { path: "../../public/fonts/manrope-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/manrope-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/manrope-600.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/manrope-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-manrope",
  display: "swap",
});

/**
 * Every font is served from this repository rather than fetched at build time.
 *
 * next/font/google downloads a font while the site is being built, so the build
 * depends on Google being reachable from the builder. It was not: Vercel failed
 * with module-not-found on the generated Noto Sans Bengali CSS, every deploy
 * after that was the last good one, and the live admin broke because the
 * database had moved on while the code had not.
 *
 * The files are in public/fonts, three weights, 105 KB each, Bengali subset
 * only (U+0980-09FE). Noto is under the Open Font License, so shipping it is
 * fine. A build that needs no network for its fonts cannot fail this way again.
 */
const notoBengali = localFont({
  src: [
    { path: "../../public/fonts/noto-bengali-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/noto-bengali-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/noto-bengali-600.woff2", weight: "600", style: "normal" },
  ],
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
        {/* Both packages were installed and never mounted, so the dashboard
            had nothing to show. They send no cookies and no personal data, which
            is why they can go in without a consent banner. */}
        <Analytics />
        <SpeedInsights />
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
