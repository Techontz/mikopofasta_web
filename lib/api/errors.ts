import type { ApiErrorBody } from "@/lib/api/types";

/**
 * Thrown by lib/api/client.ts on any non-success response. Components and
 * Server Actions catch this once at the boundary and switch on `errorCode` —
 * a stable machine-readable string the backend defines — never on the message
 * text, and never falling back to a generic "Something went wrong" when the
 * API has told us precisely what happened.
 */
export class ApiError extends Error {
  readonly errorCode: string;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(body: ApiErrorBody & { status?: number }) {
    super(body.message);
    this.name = "ApiError";
    this.errorCode = body.error_code;
    this.status = body.status ?? 0;
    this.fieldErrors = body.errors;
  }

  /**
   * Builds an ApiError from a response the API rejected.
   *
   * A payload that is not the §1 envelope — an HTML error page from a proxy, an
   * empty 502 — still produces a usable error, keyed off the status, so the UI
   * can say something true rather than something generic.
   */
  static fromResponse(status: number, payload: unknown): ApiError {
    if (isApiErrorBody(payload)) {
      return new ApiError({ ...payload, status });
    }

    return new ApiError({
      message: FALLBACK_BY_STATUS[status] ?? "The server returned an unexpected response.",
      error_code: FALLBACK_CODE_BY_STATUS[status] ?? "UNKNOWN",
      status,
    });
  }

  /** True when the API rejected the request body (§1: 422 carries `errors`). */
  get isValidation(): boolean {
    return this.errorCode === "VALIDATION_FAILED" || this.fieldErrors !== undefined;
  }

  /** True when the session is gone, or was never established. */
  get isUnauthenticated(): boolean {
    return this.status === 401 || this.errorCode === "UNAUTHENTICATED";
  }
}

function isApiErrorBody(payload: unknown): payload is ApiErrorBody {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "error_code" in payload &&
    typeof (payload as ApiErrorBody).error_code === "string"
  );
}

const FALLBACK_BY_STATUS: Record<number, string> = {
  401: "Your session has expired. Please log in again.",
  403: "You don't have permission to do that.",
  404: "That record could not be found.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "The server ran into a problem. Please try again.",
  502: "The server is unavailable right now. Please try again shortly.",
  503: "The server is unavailable right now. Please try again shortly.",
  504: "The server took too long to respond. Please try again.",
};

const FALLBACK_CODE_BY_STATUS: Record<number, string> = {
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "RESOURCE_NOT_FOUND",
  429: "TOO_MANY_REQUESTS",
};

/**
 * Human copy for the error codes the backend emits.
 *
 * Entries exist only where the UI should say something different from, or
 * friendlier than, the API. Most domain errors already name the loan, branch or
 * period involved — "Loan LN-2026-000004 is closed and cannot take a repayment"
 * beats anything generic — so `describeError` prefers the server's wording when
 * there is no entry here.
 */
export const ERROR_COPY: Record<string, string> = {
  // Session and access.
  UNAUTHENTICATED: "Your session has expired. Please log in again.",
  FORBIDDEN: "You don't have permission to do that.",
  BRANCH_SCOPE_VIOLATION: "You don't have access to this branch's records.",
  RESOURCE_NOT_FOUND: "That record could not be found.",

  // Authentication.
  INVALID_CREDENTIALS: "Invalid phone number or password.",
  ACCOUNT_SUSPENDED: "This account has been suspended. Contact an administrator.",
  TOO_MANY_REQUESTS: "Too many attempts. Please wait a moment and try again.",

  // Customers and KYC. The API's own wording already names the customer or the
  // missing step in most of these, so only the ones that read as jargon are
  // reworded here.
  CUSTOMER_ALREADY_REGISTERED: "A customer with this NIDA number is already registered.",
  INVALID_OTP: "Incorrect OTP. Please try again.",
  OTP_ATTEMPTS_EXCEEDED: "Too many incorrect OTP attempts. Start the lookup again.",

  // Transport and configuration.
  NETWORK_ERROR: "Could not reach the server. Please check your connection and try again.",
  API_NOT_CONFIGURED: "The application is not configured to reach the API.",
  UNKNOWN: "Something went wrong. Please try again.",
};

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_COPY[error.errorCode] ?? error.message ?? ERROR_COPY.UNKNOWN;
  }

  return ERROR_COPY.UNKNOWN;
}
