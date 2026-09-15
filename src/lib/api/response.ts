import { NextResponse } from "next/server";
import { ZodError } from "zod";

export const API_VERSION = "1.0.0";

/**
 * Every /api/v1 response uses this envelope, success or failure, so a client
 * can branch on one field instead of guessing from the status code.
 *
 *   { "ok": true,  "data": ..., "meta": { ... } }
 *   { "ok": false, "error": { "code": "...", "message": "...", "details": ... } }
 */
export type ApiMeta = {
  requestId: string;
  version: string;
  /** cursor pagination */
  nextCursor?: string | null;
  hasMore?: boolean;
  count?: number;
};

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export type ApiErrorCode =
  | "bad_request"
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "payment_failed"
  | "out_of_stock"
  | "internal_error";

const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  validation_failed: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  payment_failed: 402,
  out_of_stock: 409,
  internal_error: 500,
};

function requestId(): string {
  return crypto.randomUUID();
}

function baseHeaders(id: string): Record<string, string> {
  return {
    "x-request-id": id,
    "x-api-version": API_VERSION,
    "cache-control": "no-store",
  };
}

export function ok<T>(
  data: T,
  meta: Partial<Omit<ApiMeta, "requestId" | "version">> = {},
  init: ResponseInit = {},
) {
  const id = requestId();
  return NextResponse.json(
    { ok: true as const, data, meta: { requestId: id, version: API_VERSION, ...meta } },
    { ...init, headers: { ...baseHeaders(id), ...(init.headers as object) } },
  );
}

export function fail(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
  init: ResponseInit = {},
) {
  const id = requestId();
  return NextResponse.json(
    { ok: false as const, error: { code, message, ...(details ? { details } : {}) } },
    {
      ...init,
      status: init.status ?? STATUS[code],
      headers: { ...baseHeaders(id), ...(init.headers as object) },
    },
  );
}

/** Turn any thrown value into a safe response. Never leaks a stack trace. */
export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return fail(
      "validation_failed",
      "Some fields were not filled in correctly.",
      err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    );
  }

  if (err instanceof ApiException) {
    return fail(err.code, err.message, err.details);
  }

  console.error("[api] unhandled", err);
  return fail("internal_error", "Something went wrong at our end. Please try again.");
}

/** Throw this from anywhere inside a route handler. */
export class ApiException extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiException";
  }
}

export const notFound = (what = "That") =>
  new ApiException("not_found", `${what} could not be found.`);

export const unauthorized = (message = "You need to sign in to do that.") =>
  new ApiException("unauthorized", message);

export const forbidden = (message = "You do not have access to that.") =>
  new ApiException("forbidden", message);
