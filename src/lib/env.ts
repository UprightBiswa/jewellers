import { z } from "zod";

/**
 * Environment contract.
 *
 * Required keys fail fast at boot. Optional keys are third-party integrations
 * the store can run without — each feature checks its own key and degrades
 * instead of crashing, so the site still works before Razorpay or Google OAuth
 * have been set up.
 */

const bool = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // --- required --------------------------------------------------------
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),

  // --- optional integrations -------------------------------------------
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default("silver-store"),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("orders@example.com"),
  EMAIL_ADMIN_NOTIFY: z.string().optional(),

  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Comma-separated list of origins allowed to call /api/v1 from a browser.
  API_CORS_ORIGINS: z.string().default(""),
  API_DOCS_ENABLED: bool,

  SEED_ADMIN_EMAIL: z.string().default("owner@silverstore.test"),
  SEED_ADMIN_PASSWORD: z.string().default("ChangeMe!123"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_SITE_NAME: z.string().default("Silver Store"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().optional(),
});

function parseServer() {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables.\n${issues}\n\n` +
        `Copy .env.example to .env.local and fill in the required keys.`,
    );
  }
  return parsed.data;
}

/** Server-only env. Importing this from a client component is a build error. */
export const env = parseServer();

/** Safe to read from the browser. */
export const publicEnv = clientSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
  NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
});

/** Feature flags derived from which keys are actually present. */
export const features = {
  googleAuth: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
  cloudinary: Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
  ),
  razorpay: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
  email: Boolean(env.RESEND_API_KEY),
  redis: Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
} as const;

export const corsOrigins = env.API_CORS_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
