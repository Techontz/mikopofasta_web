# Mikopofasta Microfinance OS — Frontend Technical Specification

**Stack:** Next.js 16 (App Router, Turbopack) · React 19.2 · TypeScript · Tailwind CSS v4
**Consumes:** the Laravel 12 API defined in `docs/backend-architecture-specification.md`
**Status:** Specification only — no application code is generated in this document.

This spec targets **Next.js 16 as actually installed in this repo** (confirmed `package.json`: `next@16.2.12`, `react@19.2.4`), not the Next.js 15 conventions assumed in earlier drafts. Concretely, that means: route protection lives in **`proxy.ts`** (the `middleware.ts` convention is deprecated in v16), and `params`, `searchParams`, `cookies()`, and `headers()` are **always async** — there is no synchronous fallback. Every pattern below was checked against `node_modules/next/dist/docs/` rather than assumed from training data, per this repo's `AGENTS.md`.

---

## Table of Contents
1. Platform & Rendering Strategy
2. Authentication & Session Architecture (Sanctum ↔ Next.js)
3. API Client & Data Layer
4. Route Architecture & RBAC Enforcement
5. Design System Specification
6. State Management Strategy
7. File Upload Architecture
8. Real-Time & Polling Strategy
9. Error, Loading & Empty States
10. Module → Route Map
11. Project Structure
12. Environment Configuration
13. Testing Strategy

---

## 1. Platform & Rendering Strategy

- **No `cacheComponents` / `use cache`.** This system's value proposition is real-time ledger balances and live workflow state (per the backend spec's `account_balances` cache and queued recomputation). Aggressive caching works against that. Every dashboard, ledger, and report page is dynamically rendered per request by default.
- **Turbopack is the default** build/dev tool in Next 16 — no config needed beyond what `create-next-app` already scaffolded.
- **Server Components are the default** for all data-display pages (tables, dashboards, reports); **Client Components** are used only where interactivity requires it (forms, stepper wizards, live-updating tiles, command palette, charts). This isn't a style preference — it's what makes the "read from Laravel, render server-side" data flow in §3 work without a client-side data-fetching library for the majority of pages.
- **Server Actions** (`'use server'`) are the only way components trigger Laravel mutations (loan approval, payment allocation, payroll finalize, etc.) — never a client-side `fetch` directly to the Laravel API. This keeps the Sanctum token server-side only (§2) and gives every mutation a single, auditable call site.

---

## 2. Authentication & Session Architecture (Sanctum ↔ Next.js)

Laravel Sanctum here is **token-based** (per backend spec §1), not SPA-cookie mode, because the two apps aren't guaranteed to share a top-level domain. That means the Sanctum bearer token must never reach client-side JavaScript (XSS exposure) — Next.js acts as a **Backend-for-Frontend (BFF)**:

1. `POST /login` (a Next.js Route Handler, not a Server Action, since it needs to set cookies on a fetch response) calls Laravel `POST /api/v1/auth/login`, receives the Sanctum token + user profile (role, permissions, branch/zone/region scope).
2. Next.js encrypts `{ sanctum_token, user_id, role, permissions[], branch_id, zone_id, region_id }` into a **signed, `httpOnly`, `Secure`, `SameSite=Lax` session cookie** (an encrypted-cookie session library such as `iron-session` is the pragmatic default — no separate session store needed, but a Redis-backed session is a drop-in upgrade if the cookie payload grows).
3. **`proxy.ts`** reads this cookie (synchronously decryptable, no network call) on every request to the `(dashboard)` route group, redirecting to `/login` if absent/invalid, and can immediately reject a request whose `role` lacks the route's required permission — no round trip to Laravel just to check "is this user logged in."
4. Server Components and Server Actions read the same cookie via `await cookies()` (Next 16 async API), extract `sanctum_token`, and attach `Authorization: Bearer {token}` when calling Laravel. The token itself is never sent to the browser.
5. **Logout** clears the cookie and calls Laravel's token-revocation endpoint.
6. **Permission drift:** since `permissions[]` is cached in the session cookie at login time, a mid-session permission change on the backend won't reflect until re-login/token refresh. A short session TTL (e.g. 8h, matching a work shift) plus a lightweight `refresh()` (Next 16's `next/cache` `refresh()` function, §7) triggered after any admin action that changes a role's permissions keeps this drift bounded.

This is the same reason `proxy.ts` (not middleware, since the naming changed in v16) can enforce RBAC cheaply: the permission set already lives in the signed cookie, decrypted locally, no backend call per request.

---

## 3. API Client & Data Layer

A single typed API client (`lib/api/client.ts`, conceptually) wraps every Laravel call:

- **Request:** attaches `Authorization: Bearer {token}` (read from the session, §2), `Accept: application/json`, and an `Idempotency-Key` header (a UUID) on any mutating call that the backend spec flags as idempotency-sensitive (disbursement requests, retries, webhook-adjacent actions triggered from the UI).
- **Response unwrapping:** matches the backend's envelope exactly —
  - Success: unwraps `{ data, meta }`, returning `data` to the caller with `meta.pagination` passed through separately for table components.
  - Error: a non-2xx response throws a typed `ApiError { message, errorCode, fieldErrors? }` built from `{ message, error_code, errors }`. Components/Server Actions catch this once at the boundary and render either a field-level form error (422) or a page-level error state (§9) keyed off `errorCode` — e.g. `CUSTOMER_FROZEN`, `BRANCH_SCOPE_VIOLATION`, `DUPLICATE_TRANSACTION` each map to a specific, human-worded UI treatment rather than a generic "Something went wrong."
- **Pagination:** a shared `<DataTable>` convention passes `page`/`per_page` straight through to the client, which forwards them as query params and reads `meta.pagination` back — one implementation, reused by every list page in §10.
- **No client-side data-fetching library (SWR/React Query) for the primary read path** — Server Components fetch directly via this client at render time, since the app is dynamically rendered anyway (§1). A lightweight client-side revalidation library is used **only** for the specific live-updating widgets in §8 (KPI tiles, suspense queue count), not as the app's general data layer.

---

## 4. Route Architecture & RBAC Enforcement

```
app/
  (auth)/
    login/page.tsx
    api/login/route.ts          -- BFF login Route Handler (§2)
  (dashboard)/
    layout.tsx                  -- rail + topbar + branch switcher + ⌘K, reads session for nav visibility
    dashboard/page.tsx          -- overview / KPI strip
    admin/...                   -- §10
    customers/...
    loans/...
    repayments/...
    ledger/...
    treasury/...
    hr/...
    reports/...
  proxy.ts                      -- root-level, NOT middleware.ts (Next 16 rename)
  forbidden.tsx                 -- Next 16 file convention, rendered by the forbidden() function
  unauthorized.tsx              -- Next 16 file convention, rendered by the unauthorized() function
```

- **`proxy.ts`** matches all `(dashboard)` paths, decrypts the session cookie, and:
  - No session → redirect `/login`.
  - Session present but route requires a permission the user's `permissions[]` lacks → call Next 16's `forbidden()` (renders `app/forbidden.tsx`) rather than a manual redirect, giving a proper 403 semantic response.
- **Branch/zone/region scoping is NOT re-implemented in the frontend.** The frontend never filters "which branches can this user see" client-side — every list/detail Server Component simply calls the Laravel endpoint, which applies the scope from backend spec §13. The frontend's only RBAC job is *hiding navigation and actions the user has no permission for* (good UX) — the backend remains the actual authorization boundary (good security). This avoids the classic mistake of duplicating authorization logic in two places where it can drift.
- **Route-level permission map** (declared once, consumed by both `proxy.ts` and the nav-rendering layout) mirrors backend permission strings 1:1, e.g. `/ledger/reversals/**` requires `ledger.reverse.approve`, `/loans/**/cross-branch` view requires `loans.review_cross_branch` — so adding a backend permission and a frontend route guard is always a matched pair, never independently invented.
- **Parallel/intercepting routes** are used for the two genuinely modal-feeling flows: a customer/loan detail slide-over opened from a list (`@detail` slot, intercepted from `/customers` → `/customers/[id]`) so drilling into a row never loses the underlying table's scroll/filter state — critical for a data-dense ops tool.

---

## 5. Design System Specification

- **Tokens** extend the existing `app/globals.css` (`@theme inline` block, Tailwind v4) with a full semantic set: neutral slate/zinc scale, a primary accent (deep blue/teal — **not red**, per brand rule), and success/warning/danger/info. Dark mode is supported two ways simultaneously: `prefers-color-scheme: dark` as the default signal, plus a custom Tailwind v4 variant keyed off a `data-theme` attribute so a manual toggle always wins over OS setting.
- **Primitives** scaffolded via the `shadcn/ui` CLI (Radix + Tailwind v4-compatible): dialog, dropdown, combobox, tabs, sheet/drawer, command palette, form controls.
- **Tables:** TanStack Table (headless) + TanStack Virtual for large datasets. One `<DataTable>` wrapper implements server-side sort/filter/pagination against the API client (§3) — every list page in §10 is a thin configuration of this one component, not a bespoke table each time.
- **Forms:** React Hook Form + Zod resolvers. A **schema-driven dynamic form renderer** reads a `CustomerCategory.dynamic_form_schema` (JSON, from the backend) and renders the correct fields for that category — this is the one place the frontend explicitly must NOT hardcode per-category fields, mirroring the backend's "fully configurable, no hardcoding" rule for Loan Products.
- **Charts:** Recharts, following the project's `dataviz` skill palette/form guidance at the time each chart is actually built (loaded fresh per charting task, not pre-decided here).
- **Two deliberately distinct UI modes**, token-consistent but pattern-different: workflow/stepper surfaces (loan lifecycle, KYC onboarding, disbursement retry) vs. dense data/report surfaces (ledger, portfolio, cashflow).

---

## 6. State Management Strategy

- **Server state** (everything from Laravel) lives in Server Components, refetched on navigation/revalidation — no client-side global store duplicating server data.
- **Form state**: React Hook Form, local to the form component; submission goes through a Server Action which calls the API client and returns a typed result (`{ ok: true, data }` or `{ ok: false, error }`) that the form renders inline.
- **Cross-cutting UI state** (theme, sidebar collapsed/expanded, command palette open) — a small client-side context provider per concern, not a general app-wide store; there's no case in this app for global client state to hold *business* data, since the ledger-is-the-spine architecture means business data always has one canonical source (Laravel) and one read path (Server Components).
- **Read-your-writes after a mutation:** Next 16's `updateTag()` (Server-Action-only, immediate cache expiry + refresh) is used after actions like loan approval or payment allocation so the user sees their own change instantly, rather than the `revalidateTag` stale-while-revalidate behavior which is better suited to content that can tolerate a short delay (not appropriate here, given the ledger-accuracy requirement).

---

## 7. File Upload Architecture

KYC documents (NIDA photo, liveness capture, bank deposit slips, payslips) go to Laravel Storage's private disk (backend spec §1) — never a public bucket, never client-direct-to-storage.

- Browser → **Next.js Route Handler** (`/api/uploads/[type]/route.ts`) → Route Handler reads the httpOnly session cookie server-side, extracts the Sanctum token, and forwards the multipart request to the matching Laravel endpoint (e.g. `POST /customers/{id}/documents`). This proxy hop is required precisely because the token is httpOnly and inaccessible to client JS — the browser cannot attach it directly.
- Laravel returns a stored path; the frontend never constructs or guesses storage paths. Viewing a document later goes through a **signed, time-limited URL** requested from Laravel at render time, not a cached/stored direct link.

---

## 8. Real-Time & Polling Strategy

The declared stack has no broadcasting layer (no Reverb/Pusher/Echo in the approved stack), so "real-time" balances are implemented via **short-interval client-side revalidation**, not websockets:

- KPI strip (Loan Fee, Penalty, Interest, Reserve account balances) and the Suspense-queue count use a small client component polling a lightweight Laravel read endpoint every 15–30s (visibility-aware — paused when the tab isn't focused, via the Page Visibility API) rather than a full page reload.
- Everything else (tables, detail pages) refreshes on navigation/action, which is sufficient given this isn't a chat-like real-time product — it's a real-time-*styled* balance display, not a collaborative live document.
- **Future upgrade path** (explicitly out of scope now, flagged for later): if true push updates become a requirement, Laravel Reverb + a WebSocket client is the natural add — this section is written so that upgrade only touches the KPI-tile component, not the rest of the app.

---

## 9. Error, Loading & Empty States

- **`loading.tsx`** per route segment for the initial Server Component fetch (skeleton matching the eventual table/card layout, not a generic spinner).
- **`error.tsx`** per route segment catches unexpected failures; for expected API errors (§3's typed `ApiError`), components render an inline state keyed off `errorCode` instead of falling through to the generic boundary — e.g. `BRANCH_SCOPE_VIOLATION` renders "You don't have access to this branch's records" with a link back, not a stack trace.
- **`not-found.tsx`** for missing resources (404 from the API mapped to Next's `notFound()`).
- **`forbidden.tsx` / `unauthorized.tsx`** (Next 16 file conventions, §4) for permission failures — a real 403/401 semantic page, not a redirect-disguised-as-error.
- **Empty states** are designed per-module, not generic: "No pending disbursements" reads differently from "No customers in this category yet" — each list page's empty state names the action that would populate it (e.g. a direct "New Loan Application" button on an empty loans list for a Loan Officer, omitted entirely for a Teller who can't create one).

---

## 10. Module → Route Map

| Module | Routes | Key backend endpoints consumed |
|---|---|---|
| Org Setup / Admin | `/admin/branches`, `/admin/bank-accounts`, `/admin/interest-formulas`, `/admin/loan-products`, `/admin/loan-products/[id]/schedules`, `/admin/customer-categories`, `/admin/customer-categories/[id]/eligibility`, `/admin/repayment-schedules`, `/admin/expense-categories`, `/admin/zones`, `/admin/regions`, `/admin/users` | Standard CRUD pattern (backend §15) |
| Customer & KYC | `/customers`, `/customers/new` (stepper: NIDA → OTP → Face → Additional Data → Category), `/customers/[id]`, `/groups`, `/groups/[id]` | §15.1 |
| Loan Origination | `/loans`, `/loans/new`, `/loans/[id]` (timeline + role-gated actions), `/loans/[id]/topup` | §15.2 |
| Repayments & Collections | `/repayments/suspense`, `/repayments/cash-entry`, `/repayments/reconciliation` | §15.3 |
| Ledger & Treasury | `/ledger/accounts`, `/ledger/accounts/[id]`, `/ledger/reversals`, `/treasury/bank-accounts`, `/treasury/capital` | §15.4 |
| HR, Payroll & Commission | `/hr/staff`, `/hr/staff/[id]`, `/hr/payroll`, `/hr/payroll/[period]`, `/hr/commission`, `/hr/staff-loans`, `/hr/staff-advances`, `/hr/performance` | §15.5 |
| Reporting | `/reports/[report-slug]` (one dynamic route, tab-switched, `?branch_id=&period=&from=&to=` passthrough) | §15.6 |

---

## 11. Project Structure

```
app/
  (auth)/login/
  (dashboard)/
    layout.tsx
    dashboard/
    admin/
    customers/  @detail/  [id]/
    loans/  [id]/
    repayments/
    ledger/
    treasury/
    hr/
    reports/[slug]/
  api/
    login/route.ts
    uploads/[type]/route.ts
  proxy.ts
  forbidden.tsx
  unauthorized.tsx
  globals.css
lib/
  api/client.ts          -- typed fetch wrapper, envelope unwrapping (§3)
  api/errors.ts          -- ApiError type + errorCode → UI-copy map
  auth/session.ts         -- encrypted-cookie session helpers (§2)
  permissions/routes.ts    -- route → required-permission map (§4)
components/
  ui/                     -- shadcn/ui primitives
  data-table/              -- shared <DataTable> (§5)
  forms/dynamic-form/      -- CustomerCategory schema-driven renderer (§5)
  charts/
```

---

## 12. Environment Configuration

| Variable | Purpose |
|---|---|
| `LARAVEL_API_URL` | Server-only base URL for the Laravel API (never `NEXT_PUBLIC_`, since all calls are server-side per §3) |
| `SESSION_SECRET` | Encryption key for the BFF session cookie (§2) |
| `VODACOM_WEBHOOK_PUBLIC_BASE_URL` | If the frontend ever needs to display/construct webhook-related links for ops visibility |

Notably **no** `NEXT_PUBLIC_API_URL` — the browser never talks to Laravel directly (§2, §3), so there's nothing API-related that needs to be public.

---

## 13. Testing Strategy

- **Component/unit:** the shared `<DataTable>`, dynamic form renderer, and API client's envelope/error unwrapping are the highest-leverage things to unit test, since every module reuses them.
- **Proxy testing:** Next 16's `next/experimental/testing/server` (`unstable_doesProxyMatch`) verifies `proxy.ts` matchers actually cover every `(dashboard)` path and don't accidentally exclude a route that should be guarded.
- **E2E golden paths** (once built): login → create customer → KYC complete → loan application → approval → disbursement (mocked) → repayment allocation, run against a seeded Laravel test database — this is the single flow that exercises the most cross-module integration and is worth automating first.

---

## Implementation Addenda (Phases 1–7)

### F-1 — Breadcrumb labels come from a client-side registry, not the layout

Detail pages publish their entity's display name to a small external store
(`lib/breadcrumb-store.ts`) which the header breadcrumb reads via `useSyncExternalStore`.

A server-resolved trail in the dashboard layout was rejected: App Router layouts are not
re-rendered on client-side navigation, so the label would go stale as soon as the user
moved between two detail pages. The store is keyed by pathname so a label can never leak
onto a different route, and each detail page clears it on unmount.

Pre-hydration, an entity segment falls back to a parent-derived noun ("Customer", "Entry")
rather than a mangled id ("Cust 1", "Je 14").

### F-2 — Responsive contract for the app shell

Three rules the shell must keep, each of which was violated at some point and is now
regression-tested at 390 / 768 / 1400 px across every route:

1. **Header controls collapse to icons below `lg`, not `sm`.** The desktop sidebar appears
   at `md` (256 px); expanding the search box and branch switcher at `sm` left no room
   between 768–1023 px.
2. **`SidebarInset` carries `min-w-0`.** Without it a wide table cannot shrink below its
   intrinsic width and pushes the whole page past the viewport instead of scrolling.
3. **Wide content scrolls inside its own container** — `overflow-x-auto` on the
   `<DataTable>` wrapper and on any hand-rolled table or tab strip.

### F-3 — Reports are read-models over the operational data

Every report is computed from the same arrays the operational modules mutate — there is no
parallel reporting store, no denormalised snapshot, and no report-only seed data. Report
totals are therefore guaranteed to agree with the module screens and, where the report is
financial, with the trial balance.
