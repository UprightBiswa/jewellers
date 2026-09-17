import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/settings";

export const alt = "Charubala Silver — handmade 925 silver";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card WhatsApp and Facebook show when someone shares the shop.
 *
 * Drawn here rather than uploaded as a file so it always carries the current
 * shop name and town — the owner renames the shop in Settings and this follows.
 * Deliberately typographic: a real product photo would need choosing, and a
 * badly-cropped one looks worse than none.
 */
export default async function OpengraphImage() {
  const { store } = await getSettings();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f5f6f8",
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="7" fill="#7E2B3A" />
            <path
              d="M23 10.2A8.6 8.6 0 1 0 23 21.8"
              fill="none"
              stroke="#F6E9EB"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <rect
              x="21.6"
              y="13.6"
              width="4.8"
              height="4.8"
              rx="0.7"
              transform="rotate(45 24 16)"
              fill="#C9A46B"
            />
          </svg>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#9A7B4F",
            }}
          >
            925 Silver · Handmade
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 88, color: "#14171a", lineHeight: 1.05 }}>
            {store.name}
          </div>
          <div style={{ fontSize: 34, color: "#3c434c", marginTop: 18 }}>
            {store.tagline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 24,
            color: "#6a717b",
            borderTop: "2px solid #e1e5ea",
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex" }}>
            {[store.city, store.state].filter(Boolean).join(", ")}
          </div>
          <div style={{ display: "flex", color: "#7E2B3A" }}>{store.phone}</div>
        </div>
      </div>
    ),
    size,
  );
}
