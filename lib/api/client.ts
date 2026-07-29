import "server-only";
import { ApiError } from "@/lib/api/errors";
import type { ApiSuccess } from "@/lib/api/types";

/**
 * The single network boundary between this app and the Laravel API.
 *
 * Server-only by construction: `import "server-only"` makes it a build error to
 * pull this into a Client Component, which is what keeps the bearer token out
 * of the browser bundle. The token lives in the encrypted iron-session cookie
 * and is read here, never passed down as a prop.
 *
 * Every resource module (lib/api/*.ts) calls `apiRequest`, so the §1 envelope
 * is unwrapped in exactly one place and every failure surfaces as one type.
 *
 * `mockRequest` remains below for the modules not yet integrated; it is removed
 * as each one moves across.
 */

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Serialised as JSON. Omit for GET. */
  body?: unknown;
  /**
   * A multipart body, for the two endpoints that take a file — document upload
   * and KYC face capture. Mutually exclusive with `body`: `Content-Type` is
   * deliberately left unset so fetch can generate the multipart boundary, and
   * a hand-set JSON content type would break that.
   */
  formData?: FormData;
  /** Appended as a query string; undefined, null and empty values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** The bearer token, when the call is authenticated. */
  token?: string;
  /**
   * §1 requires an `Idempotency-Key` on money-moving endpoints. Passed through
   * so a retry of the same logical operation replays rather than repeats.
   */
  idempotencyKey?: string;
  /**
   * Next 16 leaves `fetch` uncached unless told otherwise, which is the right
   * default for per-user data. Set these only for genuinely shared,
   * non-sensitive resources.
   */
  revalidate?: number;
  tags?: string[];
}

function resolveBaseUrl(): string {
  const base = process.env.LARAVEL_API_URL;

  if (!base) {
    throw new ApiError({
      message:
        "LARAVEL_API_URL is not configured. Copy .env.example to .env.local and point it at the API.",
      error_code: "API_NOT_CONFIGURED",
    });
  }

  return base.replace(/\/+$/, "");
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]): string {
  const url = new URL(`${resolveBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

/**
 * Performs the request and unwraps the §1 envelope.
 *
 * A non-2xx response becomes an `ApiError` carrying the backend's own
 * `error_code`, so callers switch on a stable machine-readable string rather
 * than parsing prose. An unreachable API becomes an ApiError too: a caller
 * should not have to distinguish "the server said no" from "there was no
 * server" by catching two different types.
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiSuccess<T>> {
  const { method = "GET", body, formData, query, token, idempotencyKey, revalidate, tags } = options;

  const headers: Record<string, string> = { Accept: "application/json" };

  // Not for formData — see ApiRequestOptions.formData.
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const next =
    revalidate !== undefined || tags
      ? { next: { ...(revalidate !== undefined ? { revalidate } : {}), ...(tags ? { tags } : {}) } }
      : {};

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
      ...next,
    });
  } catch {
    throw new ApiError({
      message: "Could not reach the server. Please check your connection and try again.",
      error_code: "NETWORK_ERROR",
    });
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  const payload = await readJson(response);

  if (!response.ok) {
    throw ApiError.fromResponse(response.status, payload);
  }

  return payload as ApiSuccess<T>;
}

/** Unwraps to just the `data`, which is what most callers want. */
export async function apiData<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { data } = await apiRequest<T>(path, options);
  return data;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    // An HTML error page from a proxy, or an empty body. The status is still
    // meaningful even when the payload is not.
    return null;
  }
}

/**
 * Mock network layer for the modules not yet integrated.
 *
 * Retained deliberately: modules move to the real API one at a time, and the
 * ones still on mock data must keep working exactly as before until their turn.
 */
export async function mockRequest<T>(resolver: () => T, options?: { delayMs?: number }): Promise<ApiSuccess<T>> {
  const delay = options?.delayMs ?? 250;
  await new Promise((resolve) => setTimeout(resolve, delay));

  try {
    const data = resolver();
    return { data };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError({ message: "Unexpected mock data error.", error_code: "UNKNOWN" });
  }
}
