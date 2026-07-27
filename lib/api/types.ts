/**
 * Mirrors docs/backend-architecture-specification.md §1 response envelope
 * exactly, so swapping the mock implementation in lib/api/client.ts for a
 * real `fetch` against Laravel later requires no change to callers.
 */
export interface ApiSuccess<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      perPage: number;
      total: number;
    };
    [key: string]: unknown;
  };
}

export interface ApiErrorBody {
  message: string;
  error_code: string;
  errors?: Record<string, string[]>;
}
