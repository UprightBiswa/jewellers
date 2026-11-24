"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Analytics, each piece switched on only by its own key being present.
 *
 * Nothing loads in development, and nothing loads for a service that has not
 * been set up — so the shop never pays a third-party script's load cost for a
 * tag that is not collecting anything. Vercel's own two are the exception: they
 * are first-party on Vercel, cost nothing to the page, and answer the question
 * the owner will actually ask ("is anyone visiting, and is it slow?").
 *
 * Both GA4 and Meta load with `afterInteractive`, so they never sit in front of
 * the product images on a phone.
 *
 * A client component, because the Meta pixel has to be told about navigation
 * (see PixelPageViews). `NEXT_PUBLIC_*` is inlined at build time, so reading it
 * here is the same value the server would have read.
 */
export function Analytics() {
  const isProduction = process.env.NODE_ENV === "production";
  const ga = process.env.NEXT_PUBLIC_GA_ID;
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  if (!isProduction) return null;

  return (
    <>
      <VercelAnalytics />
      <SpeedInsights />

      {ga ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga}', { anonymize_ip: true });
            `}
          </Script>
        </>
      ) : null}

      {pixel ? (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window,document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${pixel}');
              fbq('track', 'PageView');
            `}
          </Script>
          <PixelPageViews />
        </>
      ) : null}
    </>
  );
}

/**
 * A PageView for every page after the first.
 *
 * Meta's copy-and-paste snippet fires one PageView when the script runs, which
 * on a full page reload is correct and in this app is almost never what
 * happens. Every move after the first — category to product to bag — is a
 * client-side navigation: no script re-runs, no PageView is sent, and Meta sees
 * one page per visit no matter how far anyone browsed. Ad audiences built on
 * "visited a product page" would stay empty.
 *
 * Keyed on the path only, deliberately. Filters and sort live in the query
 * string, so including it would report half a dozen PageViews for one person
 * ticking boxes on the collections page.
 */
function PixelPageViews() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    // The init snippet already sent one for the page we loaded on.
    if (first.current) {
      first.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  return null;
}

/**
 * Tells Meta a sale happened, once.
 *
 * Without this the pixel can count visitors but not buyers, which leaves it
 * unable to do the one thing it is installed for: optimise an ad towards people
 * who actually order, and report what the spend earned.
 *
 * `eventID` is the order number. If this ever fires twice — a refresh, a
 * back-button, a server-side Conversions API call added later — Meta
 * de-duplicates on that id and still counts one sale.
 *
 * `value` is rupees, because that is what Meta expects; everything else in this
 * codebase is paise, so the conversion happens at the call site where the unit
 * is unambiguous.
 */
export function PixelPurchase({
  value,
  orderNumber,
}: {
  value: number;
  orderNumber: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_META_PIXEL_ID) return;
    if (sent.current) return;
    sent.current = true;

    /*
     * fbq may not exist yet: this page can finish mounting before an
     * `afterInteractive` script has run. The snippet's stub queues calls, but
     * only once the snippet itself has executed — so calling too early is a
     * silently dropped sale, which is the worst kind. Wait for it, briefly.
     */
    let tries = 0;
    const send = () => {
      if (window.fbq) {
        window.fbq("track", "Purchase", { value, currency: "INR" }, { eventID: orderNumber });
        return;
      }
      if (tries++ < 20) window.setTimeout(send, 250);
    };
    send();
  }, [value, orderNumber]);

  return null;
}

declare global {
  interface Window {
    fbq?: (
      command: string,
      event: string,
      params?: Record<string, unknown>,
      options?: { eventID?: string },
    ) => void;
  }
}
