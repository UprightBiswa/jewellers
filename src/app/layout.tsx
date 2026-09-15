import type { Metadata, Viewport } from "next";
import { Marcellus, Manrope, Noto_Sans_Devanagari } from "next/font/google";
import { Toaster } from "sonner";

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

const notoDeva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-deva",
  display: "swap",
});

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Silver Store";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — Handcrafted 925 Sterling Silver`,
    template: `%s · ${siteName}`,
  },
  description:
    "Hallmarked 925 sterling and 999 fine silver jewellery, made by hand and shipped across India. Rings, payal, bracelets, pendants and puja silver.",
  keywords: [
    "silver jewellery", "925 sterling silver", "chandi jewellery",
    "silver payal", "silver rings", "BIS hallmark silver", "buy silver online India",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName,
    url: siteUrl,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  formatDetection: { telephone: true, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1013" },
  ],
};

/**
 * Applies the saved theme before first paint so a dark-mode visitor never sees
 * a white flash. Inline by necessity — a deferred script is already too late.
 */
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark" || t === "light") {
      document.documentElement.setAttribute("data-theme", t);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${marcellus.variable} ${manrope.variable} ${notoDeva.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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
