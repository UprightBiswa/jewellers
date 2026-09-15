import { cache } from "react";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * Store settings live in the database, not in code, because the owner changes
 * them himself — free-shipping threshold during a festival, COD limit after a
 * bad month, GST rate when his registration comes through.
 *
 * Every key has a default here, so a fresh database still renders a working
 * shop and no page has to defend against a missing row.
 */

export const settingsSchema = z.object({
  store: z.object({
    name: z.string().default("Silver Store"),
    tagline: z.string().default("Handcrafted 925 sterling silver"),
    email: z.string().default("orders@example.com"),
    phone: z.string().default("+91 00000 00000"),
    whatsapp: z.string().default(""),
    addressLines: z.array(z.string()).default([]),
    city: z.string().default(""),
    state: z.string().default(""),
    pincode: z.string().default(""),
    mapUrl: z.string().default(""),
    sinceYear: z.string().default(""),
  }).prefault({}),

  tax: z.object({
    gstEnabled: z.boolean().default(false),
    gstin: z.string().default(""),
    /** 3% is the GST on finished jewellery in India */
    ratePercent: z.number().default(3),
    /** true when the price shown to a customer already contains GST */
    pricesIncludeGst: z.boolean().default(true),
  }).prefault({}),

  shipping: z.object({
    /** paise */
    flatFee: z.number().default(7000),
    /** paise, null disables free shipping entirely */
    freeAbove: z.number().nullable().default(99900),
    dispatchDays: z.string().default("1–2 working days"),
    deliveryDays: z.string().default("4–7 working days"),
    shipsTo: z.string().default("All India"),
  }).prefault({}),

  payments: z.object({
    codEnabled: z.boolean().default(true),
    /** paise — orders above this cannot be COD */
    codMaxOrder: z.number().default(500000),
    /** paise added to a COD order */
    codFee: z.number().default(5000),
    onlineEnabled: z.boolean().default(true),
  }).prefault({}),

  returns: z.object({
    windowDays: z.number().default(7),
    buyback: z.string().default("Exchange available at the shop"),
    nonReturnable: z.string().default("Engraved and custom-made pieces"),
  }).prefault({}),

  announcements: z.array(z.string()).default([
    "Free delivery on orders above ₹999",
    "BIS hallmarked 925 sterling silver",
    "Made by hand in India",
  ]),

  social: z.object({
    instagram: z.string().default(""),
    facebook: z.string().default(""),
    youtube: z.string().default(""),
  }).prefault({}),

  catalog: z.object({
    /** Fallback when a product does not override it */
    defaultPriceMode: z.enum(["FIXED", "WEIGHT"]).default("FIXED"),
    lowStockThreshold: z.number().default(3),
    showWeight: z.boolean().default(true),
    showPurity: z.boolean().default(true),
  }).prefault({}),
});

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsGroup = keyof Settings;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

/**
 * One query per request, memoised by React. Deliberately not cached across
 * requests: when the owner saves a setting he expects to see it immediately,
 * and this is a single indexed read.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const rows = await db.setting.findMany();
    const raw: Record<string, unknown> = {};
    for (const row of rows) raw[row.key] = row.value;

    const parsed = settingsSchema.safeParse(raw);
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  } catch {
    // A store that cannot reach its database should still render its shell.
    return DEFAULT_SETTINGS;
  }
});

/** Write one top-level group. Callers are admin-only route handlers. */
export async function saveSettingsGroup<K extends SettingsGroup>(
  key: K,
  value: Settings[K],
): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}
