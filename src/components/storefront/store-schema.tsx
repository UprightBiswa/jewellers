import { getSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";

/**
 * Structured data for the shop itself.
 *
 * JewelryStore is a LocalBusiness subtype, which is what earns the map card and
 * the opening hours panel in Google for a shop people can actually walk into —
 * and Charubala Silver is a real counter in Gourmohan Bazar, not a warehouse.
 * Every value comes from Settings, so the owner correcting his address in the
 * admin corrects what Google reads.
 */
export async function StoreSchema() {
  const { store, shipping, returns } = await getSettings();

  const hasAddress = store.addressLines.length > 0 && store.city;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "JewelryStore",
        "@id": `${absoluteUrl("/")}#store`,
        name: store.name,
        description: store.tagline,
        url: absoluteUrl("/"),
        image: absoluteUrl("/opengraph-image"),
        ...(store.phone ? { telephone: store.phone.replace(/\s/g, "") } : {}),
        ...(store.email ? { email: store.email } : {}),
        ...(store.sinceYear ? { foundingDate: store.sinceYear } : {}),
        priceRange: "₹₹",
        currenciesAccepted: "INR",
        paymentAccepted: "UPI, Credit Card, Debit Card, Cash on Delivery",
        ...(hasAddress
          ? {
              address: {
                "@type": "PostalAddress",
                streetAddress: store.addressLines.join(", "),
                addressLocality: store.city,
                addressRegion: store.state,
                postalCode: store.pincode,
                addressCountry: "IN",
              },
            }
          : {}),
        areaServed: shipping.shipsTo,
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
            ],
            opens: "10:00",
            closes: "20:00",
          },
        ],
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: "IN",
          returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
          merchantReturnDays: returns.windowDays,
          returnMethod: "https://schema.org/ReturnByMail",
          returnFees: "https://schema.org/FreeReturn",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${absoluteUrl("/")}#website`,
        url: absoluteUrl("/"),
        name: store.name,
        inLanguage: ["en-IN", "bn-IN"],
        publisher: { "@id": `${absoluteUrl("/")}#store` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
