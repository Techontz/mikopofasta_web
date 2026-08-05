# Frontend Integration Matrix

Every route in the application, and what it reads.

Produced by walking each `page.tsx`'s import graph transitively — a page is
recorded as reading an endpoint only if some module it actually imports calls
that endpoint, so a page cannot be counted live because of a comment or an
unused import. Every route was then rendered against a seeded API with a real
super-admin session and checked for a 200 and an absence of error shells.

**113 routes — 101 live, 4 carrying no data by design, 8 excluded.**

> **Phase 1 (August 2026) added four routes**, all inside the existing Bank
> section: `/treasury/periods`, `/treasury/reserve`, `/treasury/reconciliation`
> and `/treasury/write-offs`. Each was rendered against a live seeded API across
> four roles (Finance, Admin, Teller, Loan Officer) and driven through its full
> workflow in a real browser — 22/22 interaction checks. See
> `../../mikopofasta_api/docs/modules/accounting.md`.

## Excluded from this phase

| Area | Routes | Why |
| --- | --- | --- |
| Agent | `/agent/deposits`, `/agent/payment-modes`, `/agent/transactions` | No backend module. Excluded by instruction. |
| Insurance | `/insurance/balance`, `/insurance/movements`, `/insurance/today`, `/insurance/today-withdrawals` | No backend module. Excluded by instruction. |
| VISA | `/visa` | No backend module. Excluded by instruction. |

These eight still read `lib/legacy/source.ts`. That file survives for them alone
and has no other importer left in the codebase.

## Carrying no data by design

| Route | What it is |
| --- | --- |
| `/` | Redirects to `/dashboard` or `/login` on the session. |
| `/login` | The form. Posts to `/api/v1/auth/login`; renders nothing from the API. |
| `/access-denied` | Static. Shown when a policy refuses a page. |
| `/admin` | A section index — links to the twelve admin screens, no data of its own. |

## One screen waiting on a backend feature

The notification bell in the dashboard shell reads `lib/pending/notifications-fixture.ts`.
There is no `GET /api/v1/notifications` to call: Module 6 built notification
*template* management — trigger events, channels, placeholders, one active
template per event — but nothing sends a notification and nothing lists one.
This is a page waiting on a backend feature, not on wiring, which is why the
fixture sits under `lib/pending/` rather than in a mock directory. The layout
calls it with `.catch(() => [])` so the bell degrades to empty.

## The matrix

Endpoints are shown by family. A route listed against several families calls all
of them — usually one for its rows and the others for its filters, e.g. a list
screen reading `/branches` to populate a branch facet.

| Route | Backend endpoints | Status |
| --- | --- | --- |
| [/](/) | — | — No data (navigation/redirect) |
| [/access-denied](/access-denied) | — | — No data (navigation/redirect) |
| [/admin](/admin) | — | — No data (navigation/redirect) |
| [/admin/audit-logs](/admin/audit-logs) | `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/admin/customer-categories](/admin/customer-categories) | `/customers` | ✅ Live |
| [/admin/expense-categories](/admin/expense-categories) | `/expense-requests, /expense-categories` | ✅ Live |
| [/admin/interest-formulas](/admin/interest-formulas) | `/loans, /loan-products` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/admin/loan-fees](/admin/loan-fees) | `/loan-fees, /penalty-settings, /reserve-setting` | ✅ Live |
| [/admin/loan-products](/admin/loan-products) | `/loans, /loan-products` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/admin/notification-templates](/admin/notification-templates) | `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/admin/organization](/admin/organization) | `/branches, /regions, /zones` | ✅ Live |
| [/admin/penalty](/admin/penalty) | `/loan-fees, /penalty-settings, /reserve-setting` | ✅ Live |
| [/admin/repayment-schedules](/admin/repayment-schedules) | `/loans, /loan-products` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/admin/reserve-setting](/admin/reserve-setting) | `/loan-fees, /penalty-settings, /reserve-setting` | ✅ Live |
| [/admin/roles](/admin/roles) | `/users, /roles` | ✅ Live |
| [/admin/users](/admin/users) | `/branches, /regions, /zones` · `/users, /roles` | ✅ Live |
| [/admin/users/[id]](/admin/users/[id]) | `/staff, /payroll, /commission` · `/branches, /regions, /zones` · `/users, /roles` | ✅ Live |
| [/agent/deposits](/agent/deposits) | `lib/legacy/source.ts` | ⛔ Excluded (Agent/Insurance/VISA) |
| [/agent/payment-modes](/agent/payment-modes) | `lib/legacy/source.ts` | ⛔ Excluded (Agent/Insurance/VISA) |
| [/agent/transactions](/agent/transactions) | `lib/legacy/source.ts` | ⛔ Excluded (Agent/Insurance/VISA) |
| [/capital/contributions](/capital/contributions) | `/capital-contributions, /float-transfers, /shareholders` | ✅ Live |
| [/capital/float](/capital/float) | `/capital-contributions, /float-transfers, /shareholders` · `/branches, /regions, /zones` | ✅ Live |
| [/capital/float-accounts](/capital/float-accounts) | `/capital-contributions, /float-transfers, /shareholders` · `/ledger/*` · `/branches, /regions, /zones` | ✅ Live |
| [/capital/float-approved](/capital/float-approved) | `/capital-contributions, /float-transfers, /shareholders` | ✅ Live |
| [/capital/float-branch](/capital/float-branch) | `/capital-contributions, /float-transfers, /shareholders` · `/branches, /regions, /zones` | ✅ Live |
| [/capital/shareholders](/capital/shareholders) | `/capital-contributions, /float-transfers, /shareholders` | ✅ Live |
| [/customers](/customers) | `/customers` | ✅ Live |
| [/customers/[id]](/customers/[id]) | `/customers` · `/groups` · `/branches, /regions, /zones` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/customers/by-type/[type]](/customers/by-type/[type]) | `/customers` · `/loans, /loan-products` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/customers/new/register](/customers/new/register) | `/customers` · `/branches, /regions, /zones` | ✅ Live |
| [/customers/overview](/customers/overview) | `/customers` | ✅ Live |
| [/customers/profile](/customers/profile) | `/customers` | ✅ Live |
| [/dashboard](/dashboard) | `/customers` · `(composed)` · `/staff, /payroll, /commission` · `/ledger/*` · `/loans, /loan-products` · `/payments` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/expenses/approved](/expenses/approved) | `/expense-requests, /expense-categories` · `/branches, /regions, /zones` | ✅ Live |
| [/expenses/register](/expenses/register) | `/expense-requests, /expense-categories` | ✅ Live |
| [/expenses/requests](/expenses/requests) | `/expense-requests, /expense-categories` · `/branches, /regions, /zones` | ✅ Live |
| [/groups](/groups) | `/groups` | ✅ Live |
| [/groups/overview](/groups/overview) | `/groups` | ✅ Live |
| [/hq/expenses/approved](/hq/expenses/approved) | `/expense-requests, /expense-categories` | ✅ Live |
| [/hq/expenses/register](/hq/expenses/register) | `/expense-requests, /expense-categories` | ✅ Live |
| [/hq/expenses/requests](/hq/expenses/requests) | `/expense-requests, /expense-categories` | ✅ Live |
| [/hq/transactions/approved](/hq/transactions/approved) | `/hq-accounts, /hq-transactions` · `/branches, /regions, /zones` | ✅ Live |
| [/hq/transactions/balance](/hq/transactions/balance) | `/hq-accounts, /hq-transactions` | ✅ Live |
| [/hq/transactions/requests](/hq/transactions/requests) | `/hq-accounts, /hq-transactions` · `/branches, /regions, /zones` | ✅ Live |
| [/hr](/hr) | `/staff, /payroll, /commission` | ✅ Live |
| [/hr/branches](/hr/branches) | `/staff, /payroll, /commission` · `/branches, /regions, /zones` | ✅ Live |
| [/hr/commission](/hr/commission) | `/staff, /payroll, /commission` | ✅ Live |
| [/hr/inactive-staff](/hr/inactive-staff) | `/staff, /payroll, /commission` | ✅ Live |
| [/hr/payroll](/hr/payroll) | `/staff, /payroll, /commission` | ✅ Live |
| [/hr/payroll/[period]](/hr/payroll/[period]) | `/staff, /payroll, /commission` | ✅ Live |
| [/hr/performance](/hr/performance) | `/staff, /payroll, /commission` | ✅ Live |
| [/hr/staff](/hr/staff) | `/staff, /payroll, /commission` | ✅ Live |
| [/hr/staff-advances](/hr/staff-advances) | `/staff, /payroll, /commission` | ✅ Live |
| [/hr/staff-fund](/hr/staff-fund) | `/staff, /payroll, /commission` | ✅ Live |
| [/hr/staff-loans](/hr/staff-loans) | `/staff, /payroll, /commission` | ✅ Live |
| [/hr/staff/[id]](/hr/staff/[id]) | `/staff, /payroll, /commission` · `/branches, /regions, /zones` | ✅ Live |
| [/insurance/balance](/insurance/balance) | `lib/legacy/source.ts` | ⛔ Excluded (Agent/Insurance/VISA) |
| [/insurance/movements](/insurance/movements) | `lib/legacy/source.ts` | ⛔ Excluded (Agent/Insurance/VISA) |
| [/insurance/today](/insurance/today) | `lib/legacy/source.ts` | ⛔ Excluded (Agent/Insurance/VISA) |
| [/insurance/today-withdrawals](/insurance/today-withdrawals) | `lib/legacy/source.ts` | ⛔ Excluded (Agent/Insurance/VISA) |
| [/loan-fee/deducted-income](/loan-fee/deducted-income) | `/penalties, /loan-fees/income` · `/branches, /regions, /zones` | ✅ Live |
| [/loans](/loans) | `/loans, /loan-products` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/loans/[id]](/loans/[id]) | `/loans, /loan-products` · `/repayment-schedules, /interest-formulas` · `/users, /roles` · `/write-offs, /loans/{id}/recoveries, /bank-accounts` (only when the loan is written off or recovered) | ✅ Live |
| [/loans/book](/loans/book) | `/loans, /loan-products` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/loans/disbursed](/loans/disbursed) | `/loans, /loan-products` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/loans/new](/loans/new) | `/customers` | ✅ Live |
| [/loans/new/apply](/loans/new/apply) | `/customers` · `/loans, /loan-products` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/loans/pending](/loans/pending) | `/loans, /loan-products` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/loans/rejected](/loans/rejected) | `/loans, /loan-products` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/loans/withdrawal](/loans/withdrawal) | `/loans, /loan-products` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/login](/login) | — | — No data (navigation/redirect) |
| [/penalty/list](/penalty/list) | `/penalties, /loan-fees/income` · `/branches, /regions, /zones` | ✅ Live |
| [/penalty/paid](/penalty/paid) | `/penalties, /loan-fees/income` · `/branches, /regions, /zones` | ✅ Live |
| [/reports](/reports) | `/reports` | ✅ Live |
| [/reports/[slug]](/reports/[slug]) | `/branches, /regions, /zones` · `/reports` | ✅ Live |
| [/reports/branch-wise](/reports/branch-wise) | `/reports` | ✅ Live |
| [/reports/cash-transaction](/reports/cash-transaction) | `/reports` | ✅ Live |
| [/reports/customer-development](/reports/customer-development) | `/reports` | ✅ Live |
| [/reports/customer-statement](/reports/customer-statement) | `/customers` | ✅ Live |
| [/reports/daily](/reports/daily) | `/reports` | ✅ Live |
| [/reports/default-loan](/reports/default-loan) | `/reports` | ✅ Live |
| [/reports/file](/reports/file) | `/reports` | ✅ Live |
| [/reports/loan-collection](/reports/loan-collection) | `/reports` | ✅ Live |
| [/reports/loan-pending](/reports/loan-pending) | `/loans, /loan-products` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/reports/loan-repayment](/reports/loan-repayment) | `/reports` | ✅ Live |
| [/reports/today-receivable](/reports/today-receivable) | `/reports` | ✅ Live |
| [/reports/today-received](/reports/today-received) | `/reports` | ✅ Live |
| [/reports/write-off](/reports/write-off) | `/loans, /loan-products` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/salary-advance/active](/salary-advance/active) | `/salary-advances` | ✅ Live |
| [/salary-advance/approved](/salary-advance/approved) | `/salary-advances` | ✅ Live |
| [/salary-advance/categories](/salary-advance/categories) | `/salary-advances` | ✅ Live |
| [/salary-advance/paid](/salary-advance/paid) | `/salary-advances` | ✅ Live |
| [/salary-advance/repayments](/salary-advance/repayments) | `/salary-advances` | ✅ Live |
| [/salary-advance/requests](/salary-advance/requests) | `/staff, /payroll, /commission` · `/salary-advances` | ✅ Live |
| [/teller](/teller) | `/customers` | ✅ Live |
| [/teller/[customerId]](/teller/[customerId]) | `/customers` · `/loans, /loan-products` · `/payments` · `/repayment-schedules, /interest-formulas` | ✅ Live |
| [/treasury](/treasury) | `/capital-contributions, /float-transfers, /shareholders` · `/ledger/*` | ✅ Live |
| [/treasury/accounts](/treasury/accounts) | `/bank-accounts, /bank-transactions` · `/branches, /regions, /zones` | ✅ Live |
| [/treasury/bank-accounts](/treasury/bank-accounts) | `/bank-accounts, /bank-transactions` | ✅ Live |
| [/treasury/periods](/treasury/periods) | `/accounting/periods`, `/accounting/periods/{period}/preview` · `/reserve-setting` | ✅ Live |
| [/treasury/reconciliation](/treasury/reconciliation) | `/cash-deposits`, `/cash-deposits/unbanked` · `/bank-accounts` | ✅ Live |
| [/treasury/reserve](/treasury/reserve) | `/reserve/utilisations` · `/branches` | ✅ Live |
| [/treasury/write-offs](/treasury/write-offs) | `/write-offs` | ✅ Live |
| [/treasury/capital](/treasury/capital) | `/capital-contributions, /float-transfers, /shareholders` · `/ledger/*` | ✅ Live |
| [/treasury/expenses](/treasury/expenses) | `/bank-accounts, /bank-transactions` · `/expense-requests, /expense-categories` | ✅ Live |
| [/treasury/expenses/requests](/treasury/expenses/requests) | `/expense-requests, /expense-categories` · `/branches, /regions, /zones` | ✅ Live |
| [/treasury/payroll](/treasury/payroll) | `/staff, /payroll, /commission` | ✅ Live |
| [/treasury/payroll/[id]](/treasury/payroll/[id]) | `/staff, /payroll, /commission` | ✅ Live |
| [/treasury/transactions](/treasury/transactions) | `/bank-accounts, /bank-transactions` · `/branches, /regions, /zones` | ✅ Live |
| [/treasury/transactions/approved](/treasury/transactions/approved) | `/bank-accounts, /bank-transactions` · `/branches, /regions, /zones` | ✅ Live |
| [/treasury/transfers/branch](/treasury/transfers/branch) | `/bank-accounts, /bank-transactions` · `/branches, /regions, /zones` | ✅ Live |
| [/treasury/transfers/salary-advance](/treasury/transfers/salary-advance) | `/bank-accounts, /bank-transactions` | ✅ Live |
| [/visa](/visa) | `lib/legacy/source.ts` | ⛔ Excluded (Agent/Insurance/VISA) |
## Flagged, not changed

**`getOutstandingByLoan` fans out one request per loan.** The loan index
resource carries no balance — the API does not load schedules to list loans — so
the four loan queues and the Loan Book assemble their Outstanding tile from one
`/loans/{id}/schedule` call per disbursed loan. It is already capped at 60 and
reports a partial total rather than firing unbounded requests, and one
unreadable loan cannot take the tile down. At the seeded volume (3 disbursed
loans) it is invisible.

It surfaced during this verification: rendering 100 routes in a few seconds
tripped the API's rate limiter, and the pages that failed were exactly the ones
that fan out. Spaced normally they all return 200.

The real fix is one field — `outstandingTotal` on the loan index resource — at
which point the function collapses into a sum. That is a backend change, and
this phase was instructed not to add backend features, so it is recorded here
rather than made.
