import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SITE_URL } from "./site-url";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Oxidised Silver Payal" -> "oxidised-silver-payal" */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** SKU like "SS-RNG-4F7K2" — readable in a ledger, unique enough for a shop. */
export function makeSku(prefix: string, seed?: string): string {
  const rand = (seed ?? Math.random().toString(36).slice(2))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5)
    .padEnd(5, "0");
  return `SS-${prefix.toUpperCase().slice(0, 3)}-${rand}`;
}

/** Order numbers people can read out over the phone: SS-260915-0042 */
export function makeOrderNumber(sequence: number, at = new Date()): string {
  const yy = String(at.getFullYear()).slice(2);
  const mm = String(at.getMonth() + 1).padStart(2, "0");
  const dd = String(at.getDate()).padStart(2, "0");
  return `SS-${yy}${mm}${dd}-${String(sequence).padStart(4, "0")}`;
}

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
] as const;

export const PINCODE_RE = /^[1-9][0-9]{5}$/;
export const PHONE_RE = /^(\+91[\s-]?)?[6-9]\d{9}$/;

export function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** Truncate for meta descriptions without cutting a word in half. */
export function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}

/** Stable sort helper that does not mutate its input. */
export function sortBy<T>(items: readonly T[], key: (item: T) => number | string): T[] {
  return [...items].sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0));
}

export function formatDate(date: Date | string, withTime = false): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
