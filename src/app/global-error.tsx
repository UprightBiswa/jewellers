"use client";

/**
 * The last resort: the root layout itself failed, so there is no shop chrome,
 * no fonts and no theme tokens to rely on. Everything here is inline and
 * literal for that reason.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#f5f6f8",
          color: "#14171a",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "26rem" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 12px" }}>The site is down</h1>
          <p style={{ color: "#3c434c", lineHeight: 1.6, margin: "0 0 20px" }}>
            Something failed badly enough that the page could not load at all. Nothing has
            been charged. Please try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#7e2b3a",
              color: "#fff8ef",
              border: 0,
              borderRadius: 8,
              padding: "12px 22px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ color: "#6a717b", fontSize: "12px", marginTop: 24 }}>
              Reference {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
