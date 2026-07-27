# Mikopofasta Frontend — Readiness Report

**Scope:** stabilization audit of the complete Next.js 16 frontend after Phases 1–8.
**Verdict:** **Ready for backend integration**, with 7 specified-but-unbuilt items listed under
*Known gaps*. No blocking defects remain.

Nothing in this audit added a feature. Every change was a removal, a de-duplication, or a
correctness/accessibility fix.

---

## 1. Verification results

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | clean |
| ESLint (whole project) | **0 errors**, 10 warnings |
| Production build | clean — 40 routes |
| Domain integrity (`scripts/verify-domain.ts`) | all checks passed |
| Report reconciliation (`scripts/verify-reports.ts`) | 20/20 assertions passed |
| Responsive — 40 routes × 390/768/1024/1440 px | **160/160 clean** (0 horizontal overflow) |
| Accessibility — axe `wcag2a` + `wcag2aa`, 35 routes | **0 violations**, light **and** dark |
| Theme parity — 40 routes, both schemes | no invisible/equal-contrast text |
| RBAC — 11 roles × 24 routes | **264/264 match §14**, 0 leaks |
| Console errors across every walkthrough | **none** |

The 10 remaining ESLint warnings are all the same rule,
`react-hooks/incompatible-library`: React Compiler declining to memoize components that call
React Hook Form's `watch()`. This is a known upstream interaction, not a defect, and it does not
affect behaviour.

---

## 2. What the audit changed

### Dead code removed
- `components/feedback/coming-soon.tsx` — placeholder component, obsolete once every module shipped.
- `app/forbidden.tsx`, `app/unauthorized.tsx` — Next.js file conventions for `forbidden()` /
  `unauthorized()`, neither of which is called anywhere. The app's actual pattern is
  `AccessDeniedState`; two competing mechanisms invited confusion.
- Unreachable helpers: `runReport`, `computeBalances`, `findByIdOrThrow`, `paginate`,
  `accountBalance`, `pickWeighted`, `dateOnlyDaysFromNow`, `ALL_PERMISSIONS`, `ReportEnvelope`.
- Unwired Server Actions `recordPerformance` and `recomputeCommission` (see *Known gaps* 5 and 6 —
  the capability is now listed as a gap rather than sitting as untested code).

**Deliberately kept:** the Zod schemas and derived type aliases in `types/*.ts`. A naive scan
flags ~160 of them as "unused", but they are the approved Phase 1.5 domain-contract deliverable
and are exactly what the Laravel integration will validate against. Each is consumed by its own
`z.infer<>`.

### Duplicate logic collapsed
- **DPD buckets — a real defect.** Phase 1.5 defined the canonical buckets in `types/enums.ts`
  (`on_time` / `slight_delay` / `risk` / `default` — 0 / 1–7 / 8–30 / 30+). Phase 8 introduced a
  *second, conflicting* set inside `reports/sources.ts` (Current / 1–30 / 31–60 / 61–90 / 90+), so
  the same loan could land in different buckets on different screens. Reports now use the single
  canonical definition, and A/B/C/D scoring is aligned to the same boundaries.
- **Commission formula.** §11's HQ-hold and pool maths existed twice — in `payroll-engine.ts` and
  restated inline in the commission seed. The seed now calls the engine. Both verification scripts
  confirm identical output.
- **`MockCredential` vs `User`.** The mock user record duplicated the domain `users` shape.
  `MockCredential` now extends `types/user.ts::User`, so the mock cannot drift from the schema.

### Accessibility defects fixed
| Defect | Impact | Fix |
|---|---|---|
| 47 Select triggers had no accessible name | **critical** — screen-reader users could not tell what any dropdown was for | `aria-label` on every trigger, derived from its own field label |
| DataTable pagination icon buttons unnamed | **critical** | `aria-label` on first/prev/next/last in the shared component |
| `--muted-foreground` on `bg-muted` = 4.34:1 | **serious** — 146 nodes on all 35 routes | darkened light-mode token to clear 4.5:1 |
| `--destructive` on its 10% tint = 4.0:1 | **serious** | darkened light-mode token |
| Scrollable table region not keyboard-reachable | **serious** — WCAG 2.1.1 | `tabIndex={0}` on the shared table scroll container |

### States completed
- Added the 13 missing `loading.tsx` files (all under `/admin`); **all 44 routes** now have one.
- Added `app/(dashboard)/error.tsx`. Previously only the root boundary existed, so an error in one
  module tore down the entire shell; failures are now contained and recoverable with nav intact.

---

## 3. Spec conformance

**Server Actions → backend §15.** Every endpoint in §15.1–§15.6 has a corresponding mock action or
read-model screen, except the items in *Known gaps*. All 21 §15.6 reports are implemented behind
the single `/reports/[slug]` route with the `?branch_id=&period=&from=&to=` contract.

**Permissions → §14 + addendum A-1.** 29 permission strings in code; the 7 beyond §14's named set
are documented in A-1 and each subdivides authority §14 already grants.

**RBAC matrix.** Verified live for all 11 seeded roles. Notable correct behaviours:
- Teller reaches only `/repayments` and `/repayments/cash-entry` — no reconciliation, no suspense.
- Admin is denied `/repayments/reconciliation`; §14 assigns bank reconciliation to Finance alone.
- Finance reaches `/hr/payroll` and `/hr/staff-advances` without holding `hr.view` (addendum A-2).
- Auditor is read-only everywhere it can see, and is the only non-admin role reaching
  `/admin/audit-logs`.
- Branch-scoped users cannot widen scope via query string — `/reports/portfolio?branch_id=…` is
  forced back to their own branch server-side.

**Route map → frontend §10.** Three intentional consolidations, all functionally complete:
`/admin/{branches,regions,zones}` are tabs within `/admin/organization`;
`/admin/loan-products/[id]/schedules` is inside the product dialog; `/hr/staff-loans` is merged
into `/hr/staff-advances`. `/ledger/accounts` is served by `/ledger`.

**TODOs.** Exactly one marker remains in the entire source tree — `TODO(OSC-1)` in
`features/repayments/actions.ts`, the documented backend-dependent conflict. No `console.log`,
no `any`, no `@ts-ignore`. One `eslint-disable` remains (mount-only draft restore in the
registration wizard) and now carries a written justification.

**Docs.** `backend-architecture-specification.md` carries OSC-1 and addenda A-1…A-6;
`frontend-technical-specification.md` carries F-1…F-3. Both match the implementation as audited.

---

## 4. Known gaps — specified but not built

These are in the specification and deliberately **not** implemented during this audit, because the
brief was explicitly "no new features". Each needs a decision before or during integration.

| # | Gap | Spec reference | Notes |
|---|---|---|---|
| 1 | **Groups module** — `/groups`, `/groups/[id]` | frontend §10; `groups`, `group_members` (§2.4) | Domain types and seed data exist; group membership is shown read-only on the customer profile. No management screens. |
| 2 | **Loan top-up** — `/loans/[id]/topup` | frontend §10; `GET /loans/{id}/topup-eligibility` (§15.2) | `checkTopupEligibility()` is implemented and retained; no UI calls it. |
| 3 | **Bank account CRUD** — `/admin/bank-accounts` | §15 standard CRUD list | `/treasury/bank-accounts` is read-only. |
| 4 | **Category→product eligibility editing** — `/admin/customer-categories/[id]/eligibility` | frontend §10; `category_product_eligibility` (§2.3) | Eligibility is seed-only; the loan wizard reads it but nothing edits it. |
| 5 | **Staff registration** — `POST /staff` | §15.5 | Staff profiles are seeded. Admin can create *users*, but no `staff_profiles` row is created. |
| 6 | **Performance recording** — `POST /staff/performance` | §15.5 | `/hr/performance` is read-only. |
| 7 | **Post-registration customer edits** — `POST /customers/{id}/additional-data`, `PUT /customers/{id}/category` | §15.1 | Both are captured during the registration wizard; neither can be changed afterwards. |

---

## 5. Carried-forward items for the backend team

- **OSC-1 — penalty accrual posting.** §7 asks for a `Dr Loan Arrears / Cr Expected Schedule` entry,
  but "Expected Schedule" is not among §5's accounts and §5 already recognises penalty income on
  collection. No entry is posted; accrued penalties live on `loan_schedules.penalty_due` and in
  `penalty_runs`. Two resolution options are written up in the architecture doc.
- **A-3 — income accounts can hold a net debit** after a cross-period reversal. Reporting must not
  assume income balances are non-negative.
- **A-5 — month-end close is not branch-tagged**, so branch P&L reflects period activity while the
  system-wide trial balance reflects the post-close position. Per-branch figures reconcile to the
  branch-tagged subset of the ledger, not to system-wide net balances.
- **Known behaviour, not a defect:** `notFound()` renders the correct 404 UI on every dynamic
  route but returns HTTP 200, because the dashboard shell has already begun streaming. Inherent to
  streaming SSR; would need the shell to stop streaming before the page resolves.

---

## 6. Integration notes

- **Mock persistence is process-lifetime only.** Every mutation writes to in-memory arrays in
  `lib/mock-data/*`; a server restart resets to seed. This is what makes the seeded narrative
  reproducible and is the intended boundary for swapping in the API client.
- **`lib/api/client.ts`** is the single seam. Server Actions currently mutate mock arrays directly;
  each maps 1:1 onto a §15 endpoint, so replacement is per-action rather than per-screen.
- **Auth is a mock BFF.** Plaintext passwords in `MockCredential`, iron-session cookie. Replaced
  wholesale by Sanctum tokens per frontend spec §2.
- **The ledger is the reconciliation anchor.** `postEntry()` is the only write path and asserts
  debit = credit on every call. Both verification scripts should be kept in CI — they are what
  proves reports agree with the ledger and with the operational screens.
