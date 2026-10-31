/**
 * Is this credential usable, or just present?
 *
 * One place, because the answer has to be the same everywhere. A deploy with
 * UPSTASH_REDIS_REST_URL="1" once failed the whole production build, and when
 * that was fixed the health endpoint still cheerfully reported `redis: true`
 * while the limiter had quietly fallen back to memory. A status page that
 * reports a service as live when it is not is worse than having none.
 *
 * These are format checks, not proof the key works — only a real call proves
 * that. They exist to tell a genuine credential apart from an empty box someone
 * typed a "1" into, which is the failure that actually happens.
 *
 * No `server-only` here: the client bundle asks the same question about the
 * Cloudinary cloud name.
 */

/*
 * Trim, and drop a pair of quotes if the whole value is wrapped in them.
 *
 * A .env file holds RESEND_API_KEY="re_abc"; a hosting dashboard holds the
 * value alone. Copy the line rather than the value and the quotes come too, and
 * what arrives is literally `"re_abc"` — which fails every shape check here
 * and, worse, fails the real API call for a reason no error message explains.
 * Only a matched pair at both ends is removed, so a credential that genuinely
 * contains a quote is untouched.
 */
const clean = (v?: string | null): string => {
  const s = v?.trim() ?? "";
  const quoted =
    s.length > 1 &&
    ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")));
  return quoted ? s.slice(1, -1).trim() : s;
};

/**
 * A credential as the service should receive it, or undefined if it is blank.
 *
 * Every place that reads a key from the environment goes through this, so a
 * value that passes the shape check is the same value that gets sent. Checking
 * a cleaned string and then using the raw one would be worse than not cleaning
 * at all: the shop would report itself configured and still fail.
 */
export function credential(v?: string | null): string | undefined {
  const s = clean(v);
  return s === "" ? undefined : s;
}

/**
 * Why an integration is off, in one line, naming no value.
 *
 * `googleAuth: false` on the health endpoint is true but useless — it does not
 * say whether the variable is missing, has the wrong shape, or arrived wrapped
 * in quotes, and the only way to tell them apart was to guess. This is safe to
 * expose: it names the variable and the expected shape, never the contents.
 */
export function integrationReason(
  name: string,
  value: string | null | undefined,
  expectation: string,
  ok: boolean,
): string | null {
  if (ok) return null;
  if (clean(value) === "") return `${name} is not set`;
  return `${name} ${expectation}`;
}

/** Upstash REST endpoints are always https. */
export function isUpstashUrl(url?: string | null): boolean {
  return clean(url).startsWith("https://");
}

/** Resend API keys are always `re_…`. */
export function isResendKey(key?: string | null): boolean {
  return clean(key).startsWith("re_");
}

/** Razorpay key ids are `rzp_test_…` or `rzp_live_…`; the secret is opaque. */
export function isRazorpayKeyId(id?: string | null): boolean {
  return clean(id).startsWith("rzp_");
}

/** A Google OAuth client id always ends in this host. */
export function isGoogleClientId(id?: string | null): boolean {
  return clean(id).endsWith(".apps.googleusercontent.com");
}

/** A Cloudinary cloud name is a bare slug — it appears in every image URL. */
export function isCloudinaryCloudName(name?: string | null): boolean {
  return /^[a-zA-Z0-9_-]{3,}$/.test(clean(name));
}

/** The Cloudinary API key is numeric. */
export function isCloudinaryApiKey(key?: string | null): boolean {
  return /^\d{6,}$/.test(clean(key));
}

/** Long enough to be a real token rather than a placeholder. */
export function isSecretish(value?: string | null, min = 12): boolean {
  return clean(value).length > min;
}

export function isUpstashConfigured(url?: string | null, token?: string | null): boolean {
  return isUpstashUrl(url) && clean(token).length > 0;
}

export function isRazorpayConfigured(id?: string | null, secret?: string | null): boolean {
  return isRazorpayKeyId(id) && isSecretish(secret, 8);
}

export function isCloudinaryConfigured(
  name?: string | null,
  key?: string | null,
  secret?: string | null,
): boolean {
  return isCloudinaryCloudName(name) && isCloudinaryApiKey(key) && isSecretish(secret);
}

export function isGoogleAuthConfigured(id?: string | null, secret?: string | null): boolean {
  return isGoogleClientId(id) && clean(secret).length > 0;
}
