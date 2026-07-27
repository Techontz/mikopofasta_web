/**
 * Tiny external store letting a detail page publish the human-readable name
 * of the entity it is showing, so the header breadcrumb can render
 * "JE-0000014" instead of the URL id ("je-14").
 *
 * Why an external store rather than context or a server-rendered trail:
 * - The breadcrumb lives in the dashboard layout, and App Router layouts are
 *   NOT re-rendered on client-side navigation — a server-resolved trail would
 *   go stale the moment you navigate between two detail pages.
 * - `useSyncExternalStore` gives a correct SSR snapshot plus subscription
 *   without shipping an id→label index to the client.
 *
 * Keyed by pathname so a stale label can never leak onto a different route.
 */
type Entry = { pathname: string; label: string } | null;

let current: Entry = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setBreadcrumbLabel(pathname: string, label: string): void {
  if (current?.pathname === pathname && current?.label === label) return;
  current = { pathname, label };
  emit();
}

export function clearBreadcrumbLabel(pathname: string): void {
  if (current?.pathname !== pathname) return;
  current = null;
  emit();
}

export function subscribeToBreadcrumbLabel(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getBreadcrumbLabelSnapshot(): Entry {
  return current;
}

/** Server render has no client-published label yet — fall back to the route-derived one. */
export function getBreadcrumbLabelServerSnapshot(): Entry {
  return null;
}
