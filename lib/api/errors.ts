import type { ApiErrorBody } from "@/lib/api/types";

/**
 * Thrown by lib/api/client.ts on any non-success response. Components and
 * Server Actions catch this once at the boundary and switch on `errorCode`
 * per docs/frontend-technical-specification.md §3/§9 — never a generic
 * "Something went wrong."
 */
export class ApiError extends Error {
  readonly errorCode: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.errorCode = body.error_code;
    this.fieldErrors = body.errors;
  }
}

export const ERROR_COPY: Record<string, string> = {
  BRANCH_SCOPE_VIOLATION: "You don't have access to this branch's records.",
  RESOURCE_NOT_FOUND: "That record could not be found.",
  FORBIDDEN: "You don't have permission to do that.",
  UNKNOWN: "Something went wrong. Please try again.",
};

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_COPY[error.errorCode] ?? error.message;
  }
  return ERROR_COPY.UNKNOWN;
}
