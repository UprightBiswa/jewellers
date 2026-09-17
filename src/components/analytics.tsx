import Script from "next/script";
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
      ) : null}
    </>
  );
}
