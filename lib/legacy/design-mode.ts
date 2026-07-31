import "server-only";

import { ApiError } from "@/lib/api/errors";

/**
 * Let a screen render its design when the API cannot answer.
 *
 * This exists because the system is being built design-first: the Laravel API
 * is often not running, and a screen whose whole purpose is to be looked at
 * should not be a stack trace because of that. Before this, `/customers` and
 * `/customers/new` both awaited an API call with no catch, so a 401 from a
 * stopped server took the entire route down — which is what the Next overlay
 * was reporting as "Unauthenticated." with `getAllCustomers` in the stack.
 *
 * The failure is real and is not being swallowed. Two things keep this honest:
 *
 *   1. It only substitutes on failures that mean "the backend is not there" —
 *      a 401/403/404/5xx or a transport error. A 422 is a real answer to a real
 *      request and still throws, because a validation failure is information,
 *      not an outage.
 *   2. It reports back that it fell back, and every caller is expected to say
 *      so on screen. Silently showing eighteen placeholder customers as though
 *      they were the business's real book is a worse failure than the crash
 *      this replaces — the crash at least tells you something is wrong.
 *
 * When the API is wired up and running, none of this is reachable.
 */

/** What a screen got, and whether it came from the API or from the fixtures. */
export type Sourced<T> = {
  data: T;
  /** True when the API could not be reached and `data` is design fixture. */
  isDesignData: boolean;
  /** Why the API call failed, for the banner. Null when it succeeded. */
  reason: string | null;
};

/**
 * Statuses that mean "there is no usable backend here", as opposed to "the
 * backend considered your request and said no".
 *
 * 401 is included deliberately: during the design phase the common cause is a
 * stopped API or a session minted against a database that has since been
 * rebuilt, not a genuine authorization decision. Route-level permission checks
 * still run before any of this and still render AccessDeniedState — this only
 * governs what a data fetch does once the user is already past that gate.
 */
const BACKEND_UNAVAILABLE = new Set([401, 403, 404, 500, 502, 503, 504, 0]);

export async function withDesignFallback<T>(
  load: () => Promise<T>,
  fixture: T
): Promise<Sourced<T>> {
  try {
    return { data: await load(), isDesignData: false, reason: null };
  } catch (error) {
    if (error instanceof ApiError && !BACKEND_UNAVAILABLE.has(error.status)) {
      // A real answer from a live API. Not ours to paper over.
      throw error;
    }

    return {
      data: fixture,
      isDesignData: true,
      reason:
        error instanceof ApiError
          ? `The API answered ${error.status} (${error.errorCode}).`
          : "The API could not be reached.",
    };
  }
}

/**
 * The same, for a screen that needs several calls before it can render.
 *
 * All-or-nothing on purpose. A page showing live branches beside fixture
 * categories would be lying in a way that is very hard to spot — the banner
 * would be wrong either way it was worded.
 */
/**
 * The current month as `YYYY-MM`, read on the server.
 *
 * "New this month" needs a clock, and a clock read during a client render can
 * disagree with the one the server rendered against — a hydration mismatch that
 * only appears at a month boundary, which is to say never during testing.
 * Reading it once, here, and passing it down settles that.
 */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function allWithDesignFallback<T extends readonly unknown[]>(
  load: () => Promise<T>,
  fixture: T
): Promise<Sourced<T>> {
  return withDesignFallback(load, fixture);
}
