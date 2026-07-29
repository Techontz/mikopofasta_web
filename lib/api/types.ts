/**
 * Mirrors the Laravel API's §1 response envelope exactly.
 *
 * `meta.pagination` carries the backend's four camelCase keys — `lastPage` was
 * missing here while this layer was mocked, because nothing paginated yet.
 * `error_code` stays snake_case: the specification quotes it that way and the
 * backend emits it verbatim.
 */
export interface ApiPagination {
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: {
    pagination?: ApiPagination;
    [key: string]: unknown;
  };
}

export interface ApiErrorBody {
  message: string;
  error_code: string;
  /** Present only on 422 validation failures, per §1. */
  errors?: Record<string, string[]>;
}
