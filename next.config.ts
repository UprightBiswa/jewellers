import type { NextConfig } from "next";

/**
 * Security headers applied to every HTML response.
 * API CORS is handled in src/middleware.ts, not here, because it needs to read
 * the request Origin and compare it against the allow-list.
 */
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(self), payment=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    // Images are served straight from Cloudinary's edge — Vercel does no image
    // work at all. See src/lib/images/loader.ts for why that matters to the bill.
    loader: "custom",
    loaderFile: "./src/lib/images/loader.ts",

    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "ik.imagekit.io", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      // Stand-in photography, development only — production keeps a tight list.
      ...(process.env.NODE_ENV === "development"
        ? [{ protocol: "https" as const, hostname: "images.unsplash.com", pathname: "/**" }]
        : []),
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  experimental: {
    serverActions: {
      // Product image uploads go straight to Cloudinary, so server actions only
      // ever carry JSON. Keep this small on purpose.
      bodySizeLimit: "2mb",
    },

    // A production build fans out across a worker per core, and each worker
    // opens its own database connection. The local PGlite database serves one
    // query at a time, so `NEXT_SINGLE_WORKER=1 npm run build` keeps a local
    // build from exhausting it. Builds against Neon leave this unset.
    ...(process.env.NEXT_SINGLE_WORKER === "1" ? { cpus: 1 } : {}),
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The admin panel must never be indexed or framed.
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },

  async redirects() {
    return [
      { source: "/shop", destination: "/collections/all", permanent: true },
      { source: "/products", destination: "/collections/all", permanent: true },
    ];
  },
};

export default nextConfig;
