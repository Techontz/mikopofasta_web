import { ApiError } from "@/lib/api/errors";
import type { ApiSuccess } from "@/lib/api/types";

/**
 * Mock network layer. Every resource module (lib/api/branches.ts, etc.)
 * calls `mockRequest` instead of `fetch` directly. The simulated latency and
 * envelope shape match docs/backend-architecture-specification.md §1
 * exactly, so replacing the body of this one function with a real
 * `fetch(LARAVEL_API_URL + path, ...)` is the only change needed to go live
 * — no caller in the app changes.
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

export function paginate<T>(items: T[], page = 1, perPage = 20): { items: T[]; meta: ApiSuccess<T[]>["meta"] } {
  const start = (page - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    meta: { pagination: { page, perPage, total: items.length } },
  };
}
