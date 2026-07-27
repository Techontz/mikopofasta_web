# Mikopofasta Microfinance OS — Backend Architecture Specification

**Stack:** Laravel 12 · MySQL 8 · Laravel Sanctum · Laravel Queues · Laravel Storage
**Consumer:** Next.js 15 frontend (architecture approved separately)
**Status:** Specification only — no Laravel code is generated in this document.

This spec is derived directly from five business-requirement documents (Account/Ledger, Customer Registration, Loan Process, Repayment, Reporting, Staff/Commission) and encodes the two data-model decisions already locked in for the frontend:

1. **CustomerCategory, LoanProduct, and RepaymentSchedule are three independent entities.** Category drives KYC/risk/approval; Product drives interest/limits/tenure/mandate; Schedule drives repayment cadence. A pivot table expresses which products a category is eligible for.
2. **Repayment allocation order is fixed system-wide: Penalty → Interest → Principal.**

Cross-cutting rule baked into every table below: **no destructive deletes on anything financial.** Config/reference tables get `deleted_at` (soft delete). Ledger-adjacent and transactional tables (`journal_entries`, `journal_entry_lines`, `payments` once confirmed, `loan_schedules`, `disbursement_batches`) have **no `deleted_at` column at all** — deletion is architecturally impossible; the only way to undo money movement is a reversal entry.

---

## Table of Contents
1. Global API & Platform Conventions
2. Complete MySQL Database Schema
3. Entity Relationship Diagram (textual)
4. Module Dependency Diagram
5. Ledger Architecture
6. Loan Engine Design
7. Repayment Engine Design
8. Accounting Engine
9. Customer Lifecycle
10. Loan Lifecycle (state machine)
11. Staff Lifecycle
12. Branch Architecture
13. Multi-Branch Permissions
14. RBAC Roles & Permissions
15. API Architecture (per module)

---

## 1. Global API & Platform Conventions

- **Base URL:** `/api/v1/...` — versioned from day one; breaking changes ship as `/api/v2`.
- **Auth:** Laravel Sanctum, **token-based** (not SPA cookie mode), since Next.js is deployed as an independent service and may not share a top-level domain with the API. Every authenticated request sends `Authorization: Bearer {token}`. Tokens are scoped with Sanctum abilities mirroring the user's role (see §14) so a stolen token can't silently exceed the issuing user's permissions.
- **Response envelope (success):**
  ```json
  { "data": { ... } | [ ... ], "meta": { "pagination": {...} } }
  ```
- **Response envelope (error):**
  ```json
  { "message": "Human-readable summary", "error_code": "LOAN_NOT_ELIGIBLE", "errors": { "field": ["Validation message"] } }
  ```
  `errors` is present only for HTTP 422 (validation). `error_code` is a stable machine-readable string the frontend switches on (e.g. to render "Retry Disbursement" vs "Contact Finance").
- **Pagination:** Laravel's standard cursor/length-aware paginator, `?page=&per_page=` (max `per_page=100`), returned in `meta.pagination`.
- **Idempotency:** Every endpoint that triggers external side effects or money movement (disbursement request, webhook receivers, retry endpoints) requires an `Idempotency-Key` header; the server stores a hash of (key + endpoint) for 24h and replays the original response on duplicate submission. This directly implements the docs' "duplicate payment → ignore/flag" and "retry with new batch_id" rules without double-posting the ledger.
- **Webhooks** (`/webhooks/*`) are unauthenticated by Sanctum but verified via a provider-specific HMAC signature header (`X-Vodacom-Signature`, `X-Bank-Signature`) checked against a shared secret in config — never trust an unsigned callback.
- **Queues:** all ledger-affecting side effects that aren't required synchronously for the HTTP response (SMS notifications, commission/payroll computation, penalty cron application, risk-score recomputation, disbursement callback processing) run on named queues (`ledger`, `notifications`, `reports`) so a slow SMS gateway never blocks a disbursement response.
- **Storage:** Laravel Storage with a private disk for KYC documents (NIDA photo, liveness capture, bank deposit slips, payslips) — signed, time-limited URLs only, never public disk.

---

## 2. Complete MySQL Database Schema

Notation: `PK` primary key, `FK -> table.col` foreign key, `NN` not null, `UQ` unique. Money columns are `DECIMAL(18,2)`. All tables get `created_at`/`updated_at` unless noted; `created_by`/`updated_by`/`deleted_at` are listed explicitly where present.

### 2.1 Identity, Access & Audit

```
TABLE users
  id                 BIGINT UNSIGNED PK
  name               VARCHAR(150) NN
  phone              VARCHAR(20) NN UQ
  email              VARCHAR(150) NULL UQ
  password           VARCHAR(255) NN
  role_id            BIGINT UNSIGNED NN FK -> roles.id
  branch_id          BIGINT UNSIGNED NULL FK -> branches.id   -- always populated in practice: HQ-wide roles use the Head Office branch (branches.is_head_office), per §12 Decision 2. Nullable is a schema-flexibility allowance, not the HQ-scoping mechanism — that's the BRANCHES_VIEW_ALL permission (§13/§14).
  zone_id            BIGINT UNSIGNED NULL FK -> zones.id      -- populated for zone_manager role
  region_id          BIGINT UNSIGNED NULL FK -> regions.id    -- populated for regional_manager role
  status             ENUM('active','suspended') NN DEFAULT 'active'
  last_login_at      TIMESTAMP NULL
  created_by         BIGINT UNSIGNED NULL FK -> users.id
  deleted_at         TIMESTAMP NULL
  INDEX(role_id), INDEX(branch_id), INDEX(zone_id), INDEX(region_id)

TABLE roles
  id                 BIGINT UNSIGNED PK
  name               VARCHAR(60) NN UQ   -- super_admin, admin, finance, branch_manager, loan_officer, credit_officer, hr, zone_manager, regional_manager, teller, auditor
  guard_name         VARCHAR(30) NN DEFAULT 'sanctum'

TABLE permissions
  id                 BIGINT UNSIGNED PK
  name               VARCHAR(100) NN UQ  -- e.g. 'loans.approve', 'ledger.reverse'
  guard_name         VARCHAR(30) NN DEFAULT 'sanctum'

TABLE role_has_permissions
  role_id            BIGINT UNSIGNED FK -> roles.id
  permission_id      BIGINT UNSIGNED FK -> permissions.id
  PRIMARY KEY(role_id, permission_id)

TABLE personal_access_tokens          -- Sanctum default
TABLE audit_logs
  id                 BIGINT UNSIGNED PK
  user_id            BIGINT UNSIGNED NULL FK -> users.id
  action             VARCHAR(100) NN            -- e.g. 'LOAN_APPROVED', 'RETRY_DISBURSEMENT'
  auditable_type     VARCHAR(150) NN
  auditable_id       BIGINT UNSIGNED NN
  before_json        JSON NULL
  after_json         JSON NULL
  ip_address         VARCHAR(45) NULL
  user_agent         VARCHAR(255) NULL
  created_at         TIMESTAMP
  INDEX(auditable_type, auditable_id), INDEX(user_id), INDEX(action)

TABLE account_freezes
  id                 BIGINT UNSIGNED PK
  freezable_type     VARCHAR(60) NN     -- 'customer' | 'loan' | 'staff'
  freezable_id       BIGINT UNSIGNED NN
  reason             VARCHAR(255) NN
  frozen_by          BIGINT UNSIGNED NN FK -> users.id
  frozen_at          TIMESTAMP NN
  unfrozen_by        BIGINT UNSIGNED NULL FK -> users.id
  unfrozen_at        TIMESTAMP NULL
  INDEX(freezable_type, freezable_id)
```

### 2.2 Organization Setup

```
TABLE regions       (id PK, name VARCHAR(100) NN UQ)
TABLE districts     (id PK, region_id FK->regions.id NN, name VARCHAR(100) NN, UQ(region_id,name))
TABLE wards          (id PK, district_id FK->districts.id NN, name VARCHAR(100) NN, UQ(district_id,name))
TABLE streets        (id PK, ward_id FK->wards.id NN, name VARCHAR(100) NN, UQ(ward_id,name))

TABLE zones
  id                 BIGINT UNSIGNED PK
  name               VARCHAR(100) NN UQ
  zone_manager_id    BIGINT UNSIGNED NULL FK -> users.id
  deleted_at         TIMESTAMP NULL

TABLE branches
  id                 BIGINT UNSIGNED PK
  name               VARCHAR(150) NN UQ
  region_id          BIGINT UNSIGNED NULL FK -> regions.id
  zone_id            BIGINT UNSIGNED NULL FK -> zones.id
  phone              VARCHAR(20) NN
  type               ENUM('main','sub') NN DEFAULT 'main'
  parent_branch_id   BIGINT UNSIGNED NULL FK -> branches.id
  is_head_office     BOOLEAN NN DEFAULT FALSE   -- app-layer enforced: at most one TRUE row system-wide
  status             ENUM('active','inactive') NN DEFAULT 'active'
  created_by         BIGINT UNSIGNED NULL FK -> users.id
  deleted_at         TIMESTAMP NULL
  INDEX(region_id), INDEX(zone_id), INDEX(status), INDEX(is_head_office)

TABLE bank_accounts
  id                 BIGINT UNSIGNED PK
  bank_name          VARCHAR(100) NN
  account_number     VARCHAR(50) NN UQ
  account_name       VARCHAR(150) NN
  chart_account_id   BIGINT UNSIGNED NN FK -> chart_of_accounts.id   -- auto-created ledger account
  status             ENUM('active','inactive') NN DEFAULT 'active'
  deleted_at         TIMESTAMP NULL

TABLE expense_categories
  id                 BIGINT UNSIGNED PK
  name               VARCHAR(100) NN UQ
  scope              ENUM('branch','hq') NN
  chart_account_id   BIGINT UNSIGNED NN FK -> chart_of_accounts.id   -- auto-created ledger account
  created_by         BIGINT UNSIGNED NULL FK -> users.id
  deleted_at         TIMESTAMP NULL
```

### 2.3 Loan Configuration (the 3-entity split)

```
TABLE interest_formulas
  id                 BIGINT UNSIGNED PK
  name               VARCHAR(60) NN UQ   -- 'Simple Formular', 'Flat Rate Formular', 'Reducing Formular'
  code               VARCHAR(30) NN UQ   -- 'SIMPLE' | 'FLAT' | 'REDUCING'
  description        TEXT NULL
  deleted_at         TIMESTAMP NULL

TABLE loan_products
  id                 BIGINT UNSIGNED PK
  name               VARCHAR(120) NN
  code               VARCHAR(40) NN UQ
  interest_formula_id BIGINT UNSIGNED NN FK -> interest_formulas.id
  interest_rate       DECIMAL(6,3) NN            -- percentage
  min_amount          DECIMAL(18,2) NN
  max_amount          DECIMAL(18,2) NN
  min_tenure_days     INT NN
  max_tenure_days     INT NN
  penalty_type        ENUM('percentage_of_overdue','flat_fee','percentage_per_day') NN DEFAULT 'percentage_of_overdue'
  penalty_rate        DECIMAL(6,3) NN                -- meaning depends on penalty_type (% or flat amount)
  penalty_grace_days  INT NN DEFAULT 0
  penalty_cap_amount  DECIMAL(18,2) NULL             -- optional ceiling; NULL = uncapped
  requires_mandate    BOOLEAN NN DEFAULT FALSE
  status              ENUM('active','inactive') NN DEFAULT 'active'
  created_by           BIGINT UNSIGNED NULL FK -> users.id
  deleted_at           TIMESTAMP NULL
  INDEX(status)
  -- Every field above is admin-editable through the Loan Products config module (§6). Nothing
  -- about tenure, amount, interest, mandate, or penalty is ever hardcoded in application code —
  -- the loan engine reads this row (plus the pivot below) for every decision it makes.

TABLE repayment_schedules
  id                 BIGINT UNSIGNED PK
  name               VARCHAR(60) NN UQ   -- 'Daily','Weekly','Monthly','Group'
  code               VARCHAR(20) NN UQ
  frequency_days     INT NN               -- 1, 7, 30, or group-cycle days
  deleted_at         TIMESTAMP NULL

TABLE loan_product_repayment_schedules      -- which schedules a given product allows
  id                   BIGINT UNSIGNED PK
  loan_product_id      BIGINT UNSIGNED NN FK -> loan_products.id
  repayment_schedule_id BIGINT UNSIGNED NN FK -> repayment_schedules.id
  UQ(loan_product_id, repayment_schedule_id)
  -- A loan's repayment_schedule_id (§2.5) must appear in this table for its loan_product_id,
  -- checked at loan application time (§6). Keeps Product and Schedule as independent entities
  -- (per the earlier 3-entity decision) while letting a product still restrict its valid cadences.

TABLE customer_categories
  id                     BIGINT UNSIGNED PK
  name                   VARCHAR(120) NN UQ   -- 'Boda Boda','Small Entrepreneur','Public Servant',...
  code                   VARCHAR(40) NN UQ
  risk_tier              ENUM('low','medium','high') NN
  required_documents      JSON NN                -- e.g. ["salary_slip","employer_letter"]
  dynamic_form_schema     JSON NN                -- field definitions rendered by frontend
  requires_extra_approval BOOLEAN NN DEFAULT FALSE
  created_by              BIGINT UNSIGNED NULL FK -> users.id
  deleted_at               TIMESTAMP NULL

TABLE category_product_eligibility
  id                   BIGINT UNSIGNED PK
  customer_category_id BIGINT UNSIGNED NN FK -> customer_categories.id
  loan_product_id      BIGINT UNSIGNED NN FK -> loan_products.id
  max_amount_override  DECIMAL(18,2) NULL
  requires_extra_approval BOOLEAN NN DEFAULT FALSE
  UQ(customer_category_id, loan_product_id)
```

### 2.4 Customers, KYC & Groups

```
TABLE customers
  id                   BIGINT UNSIGNED PK
  customer_number      VARCHAR(30) NN UQ
  nida_number          VARCHAR(30) NN UQ
  first_name           VARCHAR(80) NN
  middle_name          VARCHAR(80) NULL
  last_name            VARCHAR(80) NN
  dob                  DATE NN
  gender               ENUM('male','female') NN
  phone                VARCHAR(20) NN UQ
  photo_path           VARCHAR(255) NULL
  nida_verified_at     TIMESTAMP NULL
  otp_verified_at      TIMESTAMP NULL
  face_verified_at     TIMESTAMP NULL
  marital_status       ENUM('single','married','divorced','widowed') NULL
  region_id            BIGINT UNSIGNED NULL FK -> regions.id
  district_id          BIGINT UNSIGNED NULL FK -> districts.id
  ward_id              BIGINT UNSIGNED NULL FK -> wards.id
  street_id            BIGINT UNSIGNED NULL FK -> streets.id
  residence_type        ENUM('owned','rented') NULL
  customer_category_id  BIGINT UNSIGNED NULL FK -> customer_categories.id
  dynamic_form_data      JSON NULL      -- validated against category.dynamic_form_schema
  branch_id              BIGINT UNSIGNED NN FK -> branches.id
  kyc_status             ENUM('incomplete','completed') NN DEFAULT 'incomplete'
  status                 ENUM('active','suspended','frozen') NN DEFAULT 'active'
  created_by             BIGINT UNSIGNED NULL FK -> users.id
  deleted_at             TIMESTAMP NULL
  INDEX(branch_id), INDEX(customer_category_id), INDEX(kyc_status), INDEX(status)

TABLE customer_bank_details
  id                 BIGINT UNSIGNED PK
  customer_id        BIGINT UNSIGNED NN FK -> customers.id
  bank_name          VARCHAR(100) NN
  account_number     VARCHAR(50) NN
  account_name       VARCHAR(150) NN
  check_number       VARCHAR(50) NULL
  phone_number       VARCHAR(20) NULL

TABLE customer_documents
  id                 BIGINT UNSIGNED PK
  customer_id        BIGINT UNSIGNED NN FK -> customers.id
  document_type      VARCHAR(60) NN
  file_path          VARCHAR(255) NN
  uploaded_by         BIGINT UNSIGNED NULL FK -> users.id
  created_at          TIMESTAMP

TABLE groups
  id                 BIGINT UNSIGNED PK
  name               VARCHAR(120) NN
  branch_id          BIGINT UNSIGNED NN FK -> branches.id
  leader_customer_id BIGINT UNSIGNED NULL FK -> customers.id
  status             ENUM('active','inactive') NN DEFAULT 'active'
  deleted_at         TIMESTAMP NULL

TABLE group_members
  id                 BIGINT UNSIGNED PK
  group_id           BIGINT UNSIGNED NN FK -> groups.id
  customer_id        BIGINT UNSIGNED NN FK -> customers.id
  joined_at          DATE NN
  status             ENUM('active','left') NN DEFAULT 'active'
  UQ(group_id, customer_id)
```

### 2.5 Loans

```
TABLE loans
  id                    BIGINT UNSIGNED PK
  loan_number           VARCHAR(30) NN UQ
  customer_id           BIGINT UNSIGNED NN FK -> customers.id
  loan_product_id       BIGINT UNSIGNED NN FK -> loan_products.id
  repayment_schedule_id BIGINT UNSIGNED NN FK -> repayment_schedules.id
  group_id              BIGINT UNSIGNED NULL FK -> groups.id
  branch_id             BIGINT UNSIGNED NN FK -> branches.id
  officer_id            BIGINT UNSIGNED NN FK -> users.id
  principal_amount      DECIMAL(18,2) NN
  interest_rate_snapshot DECIMAL(6,3) NN     -- copied from product at application time
  penalty_rate_snapshot  DECIMAL(6,3) NN
  tenure_days            INT NN
  requires_mandate_snapshot BOOLEAN NN
  status                 ENUM('draft','pending_manager_approval','rejected','mandate_pending_otp','mandate_failed','mandate_active','pending_credit_review','pending_finance','awaiting_disbursement','disbursement_failed','escalated','active','arrears','defaulted','written_off','recovered','closed','frozen','cancelled') NN DEFAULT 'draft'
  disbursement_date      DATE NULL
  expected_completion_date DATE NULL
  approved_by             BIGINT UNSIGNED NULL FK -> users.id
  approved_at              TIMESTAMP NULL
  rejected_reason          VARCHAR(255) NULL
  closed_at                TIMESTAMP NULL
  frozen_until              DATE NULL
  created_by                BIGINT UNSIGNED NULL FK -> users.id
  deleted_at                 TIMESTAMP NULL   -- soft delete only for true data-entry mistakes pre-approval; never after disbursement (enforced in app layer)
  INDEX(customer_id), INDEX(branch_id), INDEX(status), INDEX(loan_product_id)

TABLE loan_status_history
  id                 BIGINT UNSIGNED PK
  loan_id            BIGINT UNSIGNED NN FK -> loans.id
  from_status        VARCHAR(40) NULL
  to_status          VARCHAR(40) NN
  changed_by         BIGINT UNSIGNED NULL FK -> users.id
  reason             VARCHAR(255) NULL
  created_at         TIMESTAMP
  INDEX(loan_id)

TABLE loan_schedules
  id                 BIGINT UNSIGNED PK
  loan_id            BIGINT UNSIGNED NN FK -> loans.id
  installment_number  INT NN
  due_date             DATE NN
  principal_due         DECIMAL(18,2) NN
  interest_due          DECIMAL(18,2) NN
  penalty_due            DECIMAL(18,2) NN DEFAULT 0
  principal_paid          DECIMAL(18,2) NN DEFAULT 0
  interest_paid            DECIMAL(18,2) NN DEFAULT 0
  penalty_paid              DECIMAL(18,2) NN DEFAULT 0
  status                     ENUM('pending','partial','paid','overdue') NN DEFAULT 'pending'
  UQ(loan_id, installment_number), INDEX(due_date), INDEX(status)

TABLE e_mandates
  id                 BIGINT UNSIGNED PK
  loan_id            BIGINT UNSIGNED NN FK -> loans.id
  bank_name          VARCHAR(100) NN
  otp_reference      VARCHAR(60) NULL
  status             ENUM('pending_otp','active','failed') NN DEFAULT 'pending_otp'
  failure_reason     VARCHAR(255) NULL
  verified_at        TIMESTAMP NULL
  INDEX(loan_id)

TABLE telco_verifications
  id                 BIGINT UNSIGNED PK
  loan_id            BIGINT UNSIGNED NN FK -> loans.id
  provider           VARCHAR(30) NN DEFAULT 'vodacom'
  request_payload    JSON NN
  response_payload   JSON NULL
  status             ENUM('pending','success','failed') NN DEFAULT 'pending'
  verified_at        TIMESTAMP NULL
  INDEX(loan_id)

TABLE disbursement_batches
  id                 BIGINT UNSIGNED PK
  loan_id            BIGINT UNSIGNED NN FK -> loans.id
  batch_reference    VARCHAR(40) NN UQ
  attempt_number     INT NN DEFAULT 1
  channel            ENUM('vodacom','airtel','bank') NN DEFAULT 'vodacom'
  status             ENUM('pending','success','failed','escalated') NN DEFAULT 'pending'
  failure_reason     VARCHAR(255) NULL
  requested_by       BIGINT UNSIGNED NN FK -> users.id
  requested_at       TIMESTAMP NN
  completed_at       TIMESTAMP NULL
  INDEX(loan_id), INDEX(status)

TABLE loan_topups
  id                 BIGINT UNSIGNED PK
  original_loan_id   BIGINT UNSIGNED NN FK -> loans.id
  new_loan_id        BIGINT UNSIGNED NN FK -> loans.id
  eligibility_snapshot JSON NN
  created_at          TIMESTAMP
```

### 2.6 Repayments & Collections

```
TABLE payments
  id                 BIGINT UNSIGNED PK
  payment_reference  VARCHAR(50) NN UQ
  loan_id            BIGINT UNSIGNED NULL FK -> loans.id       -- null until matched/allocated
  customer_id        BIGINT UNSIGNED NULL FK -> customers.id
  amount             DECIMAL(18,2) NN
  channel            ENUM('api','mobile_money','bank','cash') NN
  transaction_id     VARCHAR(80) NULL UQ
  status             ENUM('received','pending_verification','unmatched','allocated','confirmed','reversed','duplicate_flagged') NN DEFAULT 'received'
  branch_id          BIGINT UNSIGNED NULL FK -> branches.id
  teller_id          BIGINT UNSIGNED NULL FK -> users.id
  received_at        TIMESTAMP NN
  confirmed_at       TIMESTAMP NULL
  created_by         BIGINT UNSIGNED NULL FK -> users.id
  INDEX(loan_id), INDEX(status), INDEX(transaction_id)

TABLE payment_allocations
  id                 BIGINT UNSIGNED PK
  payment_id         BIGINT UNSIGNED NN FK -> payments.id
  loan_schedule_id   BIGINT UNSIGNED NN FK -> loan_schedules.id
  penalty_allocated  DECIMAL(18,2) NN DEFAULT 0
  interest_allocated DECIMAL(18,2) NN DEFAULT 0
  principal_allocated DECIMAL(18,2) NN DEFAULT 0
  created_at          TIMESTAMP
  INDEX(payment_id), INDEX(loan_schedule_id)

TABLE suspense_items
  id                 BIGINT UNSIGNED PK
  payment_id         BIGINT UNSIGNED NN FK -> payments.id
  reason             VARCHAR(255) NN
  amount             DECIMAL(18,2) NN
  status             ENUM('unallocated','allocated','investigating') NN DEFAULT 'unallocated'
  resolved_by        BIGINT UNSIGNED NULL FK -> users.id
  resolved_at        TIMESTAMP NULL
  INDEX(status)

TABLE cash_deposits
  id                 BIGINT UNSIGNED PK
  teller_id          BIGINT UNSIGNED NN FK -> users.id
  branch_id          BIGINT UNSIGNED NN FK -> branches.id
  amount             DECIMAL(18,2) NN
  bank_account_id    BIGINT UNSIGNED NN FK -> bank_accounts.id
  deposit_slip_path  VARCHAR(255) NULL
  status             ENUM('pending','matched','confirmed') NN DEFAULT 'pending'
  matched_payment_ids JSON NULL
  reconciled_by       BIGINT UNSIGNED NULL FK -> users.id
  reconciled_at        TIMESTAMP NULL
  INDEX(branch_id), INDEX(status)

TABLE penalty_runs
  id                 BIGINT UNSIGNED PK
  run_date           DATE NN
  loans_processed    INT NN DEFAULT 0
  total_penalty_applied DECIMAL(18,2) NN DEFAULT 0
  triggered_by       ENUM('cron','manual') NN DEFAULT 'cron'
  created_at          TIMESTAMP
```

### 2.7 Ledger / Accounting Core

```
TABLE chart_of_accounts
  id                 BIGINT UNSIGNED PK
  code               VARCHAR(20) NN UQ
  name               VARCHAR(150) NN
  type               ENUM('asset','liability','equity','income','expense','control') NN
  parent_account_id  BIGINT UNSIGNED NULL FK -> chart_of_accounts.id
  is_system          BOOLEAN NN DEFAULT FALSE      -- true for the 19 fixed accounts; false for dynamic (expense/bank/branch-cash)
  branch_id          BIGINT UNSIGNED NULL FK -> branches.id   -- populated for branch-scoped cash/expense sub-accounts
  status             ENUM('active','inactive') NN DEFAULT 'active'
  deleted_at         TIMESTAMP NULL
  INDEX(type), INDEX(branch_id)

TABLE journal_entries
  id                 BIGINT UNSIGNED PK
  entry_number       VARCHAR(30) NN UQ
  entry_date         DATE NN
  description        VARCHAR(255) NN
  source_type        VARCHAR(60) NN     -- 'loan_disbursement','repayment','payroll','commission','expense','reversal',...
  source_id          BIGINT UNSIGNED NULL
  is_reversal        BOOLEAN NN DEFAULT FALSE
  reversed_entry_id  BIGINT UNSIGNED NULL FK -> journal_entries.id
  created_by         BIGINT UNSIGNED NN FK -> users.id
  posted_at          TIMESTAMP NN
  -- NO deleted_at, NO updated_at mutation permitted post-insert (app-layer enforced immutability)
  INDEX(source_type, source_id), INDEX(entry_date)

TABLE journal_entry_lines
  id                 BIGINT UNSIGNED PK
  journal_entry_id   BIGINT UNSIGNED NN FK -> journal_entries.id
  account_id         BIGINT UNSIGNED NN FK -> chart_of_accounts.id
  debit_amount       DECIMAL(18,2) NN DEFAULT 0
  credit_amount      DECIMAL(18,2) NN DEFAULT 0
  branch_id          BIGINT UNSIGNED NULL FK -> branches.id
  customer_id        BIGINT UNSIGNED NULL FK -> customers.id
  loan_id            BIGINT UNSIGNED NULL FK -> loans.id
  staff_profile_id   BIGINT UNSIGNED NULL FK -> staff_profiles.id
  -- immutable, no deleted_at
  INDEX(account_id), INDEX(branch_id), INDEX(customer_id), INDEX(loan_id), INDEX(staff_profile_id)

TABLE account_balances                -- materialized cache, rebuilt from journal_entry_lines by a queued listener
  id                 BIGINT UNSIGNED PK
  account_id         BIGINT UNSIGNED NN FK -> chart_of_accounts.id
  branch_id          BIGINT UNSIGNED NULL FK -> branches.id
  balance            DECIMAL(18,2) NN DEFAULT 0
  last_updated_at    TIMESTAMP NN
  UQ(account_id, branch_id)

TABLE reversal_requests
  id                 BIGINT UNSIGNED PK
  journal_entry_id   BIGINT UNSIGNED NN FK -> journal_entries.id
  requested_by       BIGINT UNSIGNED NN FK -> users.id
  reason             VARCHAR(255) NN
  approved_by        BIGINT UNSIGNED NULL FK -> users.id
  status             ENUM('pending','approved','rejected') NN DEFAULT 'pending'
  INDEX(journal_entry_id), INDEX(status)
```
> Customer Ledger, Loan Ledger, Staff Ledger, and Branch Ledger are **not separate tables** — they are queries filtered on `journal_entry_lines.customer_id` / `.loan_id` / `.staff_profile_id` / `.branch_id`. This keeps one physical source of truth, matching the docs' "ledger is the source of truth" rule.

### 2.8 Treasury

```
TABLE capital_contributions
  id                 BIGINT UNSIGNED PK
  contributor_name   VARCHAR(150) NN
  amount             DECIMAL(18,2) NN
  bank_account_id    BIGINT UNSIGNED NN FK -> bank_accounts.id
  journal_entry_id   BIGINT UNSIGNED NN FK -> journal_entries.id
  contributed_at     DATE NN

TABLE dividends
  id                 BIGINT UNSIGNED PK
  period             VARCHAR(7) NN            -- 'YYYY-MM'
  total_profit       DECIMAL(18,2) NN
  reinvestment_amount DECIMAL(18,2) NN         -- 70%
  shareholder_amount  DECIMAL(18,2) NN         -- 30%
  journal_entry_id     BIGINT UNSIGNED NN FK -> journal_entries.id
  distributed_at        TIMESTAMP NN
```

### 2.9 HR, Payroll & Commission

```
TABLE staff_profiles
  id                 BIGINT UNSIGNED PK
  user_id            BIGINT UNSIGNED NN UQ FK -> users.id
  employee_number    VARCHAR(30) NN UQ
  branch_id          BIGINT UNSIGNED NULL FK -> branches.id
  zone_id            BIGINT UNSIGNED NULL FK -> zones.id
  base_salary        DECIMAL(18,2) NN
  commission_eligible BOOLEAN NN DEFAULT FALSE
  payment_method      ENUM('bank','mobile') NN
  employment_status    ENUM('active','suspended','terminated') NN DEFAULT 'active'
  hired_at              DATE NN
  deleted_at             TIMESTAMP NULL
  INDEX(branch_id), INDEX(zone_id)

TABLE staff_bank_details
  id                 BIGINT UNSIGNED PK
  staff_profile_id   BIGINT UNSIGNED NN FK -> staff_profiles.id
  bank_name          VARCHAR(100) NN
  account_number     VARCHAR(50) NN

TABLE payroll_runs
  id                 BIGINT UNSIGNED PK
  period             VARCHAR(7) NN UQ         -- 'YYYY-MM'
  status             ENUM('draft','finalized','paid') NN DEFAULT 'draft'
  generated_by       BIGINT UNSIGNED NN FK -> users.id
  finalized_at       TIMESTAMP NULL

TABLE payroll_lines
  id                 BIGINT UNSIGNED PK
  payroll_run_id     BIGINT UNSIGNED NN FK -> payroll_runs.id
  staff_profile_id   BIGINT UNSIGNED NN FK -> staff_profiles.id
  base_salary        DECIMAL(18,2) NN
  commission_amount  DECIMAL(18,2) NN DEFAULT 0
  allowances_total   DECIMAL(18,2) NN DEFAULT 0
  deductions_total   DECIMAL(18,2) NN DEFAULT 0
  net_salary         DECIMAL(18,2) NN
  journal_entry_id   BIGINT UNSIGNED NULL FK -> journal_entries.id
  UQ(payroll_run_id, staff_profile_id)

TABLE allowances
  id                 BIGINT UNSIGNED PK
  payroll_line_id    BIGINT UNSIGNED NN FK -> payroll_lines.id
  type               ENUM('transport','airtime','bonus') NN
  amount             DECIMAL(18,2) NN

TABLE deductions
  id                 BIGINT UNSIGNED PK
  payroll_line_id    BIGINT UNSIGNED NN FK -> payroll_lines.id
  type               ENUM('staff_fund','loan','advance','penalty') NN
  amount             DECIMAL(18,2) NN
  reference_id       BIGINT UNSIGNED NULL     -- staff_loans.id or staff_advances.id

TABLE commission_pools
  id                 BIGINT UNSIGNED PK
  branch_id          BIGINT UNSIGNED NN FK -> branches.id
  period             VARCHAR(7) NN
  branch_profit      DECIMAL(18,2) NN
  loss_carry_forward DECIMAL(18,2) NN DEFAULT 0
  hq_hold_amount     DECIMAL(18,2) NN          -- 2%
  distributable_profit DECIMAL(18,2) NN
  pool_percentage      DECIMAL(6,3) NN
  pool_amount           DECIMAL(18,2) NN
  UQ(branch_id, period)

TABLE commission_distributions
  id                 BIGINT UNSIGNED PK
  commission_pool_id BIGINT UNSIGNED NN FK -> commission_pools.id
  staff_profile_id   BIGINT UNSIGNED NN FK -> staff_profiles.id
  share_amount       DECIMAL(18,2) NN

TABLE zone_commission_distributions
  id                 BIGINT UNSIGNED PK
  zone_id            BIGINT UNSIGNED NN FK -> zones.id
  period             VARCHAR(7) NN
  total_pool_base    DECIMAL(18,2) NN
  override_percentage DECIMAL(6,3) NN
  override_amount      DECIMAL(18,2) NN
  journal_entry_id       BIGINT UNSIGNED NN FK -> journal_entries.id
  UQ(zone_id, period)

TABLE staff_loans
  id                 BIGINT UNSIGNED PK
  staff_profile_id   BIGINT UNSIGNED NN FK -> staff_profiles.id
  amount             DECIMAL(18,2) NN
  status             ENUM('active','closed') NN DEFAULT 'active'
  disbursed_at       DATE NN
  journal_entry_id   BIGINT UNSIGNED NN FK -> journal_entries.id

TABLE staff_advances
  id                 BIGINT UNSIGNED PK
  staff_profile_id   BIGINT UNSIGNED NN FK -> staff_profiles.id
  amount             DECIMAL(18,2) NN
  status             ENUM('requested','approved','disbursed','recovered','rejected') NN DEFAULT 'requested'
  requested_at       TIMESTAMP NN
  approved_by        BIGINT UNSIGNED NULL FK -> users.id
  approved_at        TIMESTAMP NULL
  disbursed_at       TIMESTAMP NULL
  journal_entry_id   BIGINT UNSIGNED NULL FK -> journal_entries.id

TABLE staff_performance_records
  id                 BIGINT UNSIGNED PK
  staff_profile_id   BIGINT UNSIGNED NN FK -> staff_profiles.id
  period             VARCHAR(7) NN
  targets_json       JSON NN
  achieved_json      JSON NN
  rating             ENUM('A','B','C','D') NULL
  recorded_by        BIGINT UNSIGNED NN FK -> users.id
```

### 2.10 Reporting & Notifications

```
TABLE customer_risk_scores       -- recomputed by a queued job, not a source of truth
  id                 BIGINT UNSIGNED PK
  customer_id        BIGINT UNSIGNED NN UQ FK -> customers.id
  rating             ENUM('A','B','C','D') NN
  avg_delay_days     DECIMAL(6,2) NN
  on_time_pct        DECIMAL(5,2) NN
  late_pct           DECIMAL(5,2) NN
  computed_at        TIMESTAMP NN

TABLE notifications               -- Laravel default shape (channel, notifiable, data, read_at)
```

**Total: ~54 tables.** Every FK above cascades **on update**, and uses **RESTRICT on delete** — nothing in this schema is ever hard-deleted through a cascade; soft-delete or reversal are the only paths.

---

## 3. Entity Relationship Diagram (textual)

```
users --belongs to--> roles
users --belongs to--> branches (nullable) / zones (nullable) / regions (nullable, for regional_manager)
staff_profiles --belongs to--> users (1:1)
branches --belongs to--> regions, zones; --has many--> branches (sub-branches)
branches.is_head_office marks the single HQ branch row (no separate HQ table)

loan_products --has many--> loan_product_repayment_schedules --belongs to--> repayment_schedules
  (constrains which schedules a loan of this product may use)

customers --belongs to--> customer_categories, branches, regions/districts/wards/streets
customers --has one--> customer_bank_details
customers --has many--> customer_documents
customers --has many--> loans, payments
groups --has many--> group_members --belongs to--> customers

loan_products --belongs to--> interest_formulas
customer_categories --has many--> category_product_eligibility --belongs to--> loan_products

loans --belongs to--> customers, loan_products, repayment_schedules, groups(nullable), branches, users(officer)
loans --has many--> loan_schedules, loan_status_history, e_mandates, telco_verifications, disbursement_batches
loan_schedules --has many--> payment_allocations

payments --belongs to--> loans(nullable), customers(nullable), branches(nullable)
payments --has many--> payment_allocations
payments --has one--> suspense_items (when unmatched)
cash_deposits --references--> payments via matched_payment_ids

chart_of_accounts --self-references--> parent_account_id
journal_entries --has many--> journal_entry_lines
journal_entry_lines --belongs to--> chart_of_accounts, and optionally branches/customers/loans/staff_profiles
  (this is how Customer/Loan/Staff/Branch "ledgers" are derived — filtered views, not tables)
bank_accounts --belongs to--> chart_of_accounts (1:1 system account)
expense_categories --belongs to--> chart_of_accounts (1:1 system account)

staff_profiles --has many--> payroll_lines, staff_loans, staff_advances, staff_performance_records
payroll_runs --has many--> payroll_lines --has many--> allowances, deductions
commission_pools --belongs to--> branches --has many--> commission_distributions --belongs to--> staff_profiles
zones --has many--> zone_commission_distributions

audit_logs --polymorphic--> any auditable_type/auditable_id
account_freezes --polymorphic--> customers | loans | staff_profiles
```

---

## 4. Module Dependency Diagram

```
                          ┌──────────────────────┐
                          │   LEDGER CORE (§7)    │◄──── every module below posts here,
                          │ chart_of_accounts     │      nothing else is a source of truth
                          │ journal_entries/lines │
                          └──────────┬────────────┘
                                     │ reads
              ┌──────────────────────┼───────────────────────┐
              │                      │                       │
     ┌────────▼────────┐   ┌─────────▼─────────┐   ┌─────────▼─────────┐
     │  LOAN ENGINE     │   │ REPAYMENT ENGINE   │   │  HR / PAYROLL /   │
     │  (loans,         │──►│ (payments,         │──►│  COMMISSION       │
     │  schedules,      │   │  allocations,      │   │  (reads Branch    │
     │  mandate/telco/  │   │  suspense, cash)   │   │  P&L from ledger) │
     │  disbursement)   │   └─────────┬──────────┘   └─────────┬─────────┘
     └────────┬─────────┘             │                         │
              │ depends on            │ depends on               │ posts to
     ┌────────▼─────────┐             │                          ▼
     │ CUSTOMER & KYC    │             │                  ┌──────────────┐
     │ (customer_        │◄────────────┘                  │ STAFF FUND / │
     │  categories,      │  reads eligibility               │ LOANS/ADV.  │
     │  groups)          │                                  └──────────────┘
     └────────┬──────────┘
              │ depends on
     ┌────────▼──────────┐
     │ ORG SETUP / ADMIN  │   (branches, bank accounts, interest formulas,
     │ (config layer)     │    loan products, repayment schedules, expense cats)
     └─────────────────────┘

     REPORTING & ANALYTICS reads from ALL of the above (read-only, no module depends on it)
     RBAC / AUDIT / MULTI-BRANCH wrap every module as cross-cutting concerns (not a layer, a constraint)
```

---

## 5. Ledger Architecture

**Chart of Accounts** (system accounts, `is_system=true`, auto-seeded):

| Code | Account | Type |
|---|---|---|
| 1000 | Capital Account | Equity |
| 1100 | Principal Account | Asset |
| 1200 | Loan Receivable Account | Asset |
| 1300 | Outstanding Loan Account (rollup) | Asset |
| 1400 | Outstanding Interest Account | Asset |
| 2000 | Interest Income Account | Income |
| 2100 | Fee Income Account | Income |
| 2200 | Penalty Income Account | Income |
| 3000 | Reserve Account | Control |
| 3100 | Profit Account | Equity |
| 4000 | Loan Arrears Account | Control |
| 4100 | Default Loan Account | Asset |
| 4200 | Write-Off Account | Expense |
| 4300 | Recovered Loans Account | Income |
| 5000 | Suspense Account | Control |
| 7000 | Staff Fund Account | Liability |
| 7100 | Dividend Account | Equity |
| 7200 | Offset Account | Control |

Dynamic accounts (`is_system=false`): one `6xxx` account per `expense_categories` row, one `8xxx` account per `bank_accounts` row, and one branch-scoped Teller Cash account per branch (`branch_id` populated).

**Double-entry rule:** every `journal_entries` row must have ≥2 `journal_entry_lines` where `SUM(debit_amount) = SUM(credit_amount)`. Enforced in a single `LedgerService::post()` method that is the **only** code path allowed to write to these two tables — no controller or model ever inserts directly.

**Canonical postings** (all via `LedgerService::post()`):
- Capital injection: Dr Bank/Cash · Cr Capital Account
- Disbursement: Dr Loan Receivable · Cr Principal Account
- Repayment (standard order **Penalty → Interest → Principal**): Dr Cash/Bank · Cr Penalty Income, Cr Interest Income, Cr Loan Principal (only the components actually collected, in that priority order against outstanding balances)
- Reserve cut: Dr Interest Income · Cr Reserve Account (real-time, on every interest collection)
- Underpayment: remaining shortfall → Dr Cash (partial) / Cr Loan (allocation) / Cr Loan Arrears (shortfall)
- Missed payment: Dr Loan Arrears · Cr Expected Schedule
- Write-off: Dr Write-Off Expense · Cr Loan Receivable
- Recovery: Dr Cash · Cr Recovered Loans Account
- Expense: Dr Expense (dynamic account) · Cr Cash/Bank
- Month-end profit: Dr Income Accounts · Cr Profit Account
- Dividend: Dr Profit Account · Cr Dividend Account, split 70% Principal (reinvestment) / 30% shareholders
- Unmatched payment: Dr Cash/Bank · Cr Suspense Account; on resolution: Dr Suspense · Cr Loan (via a **new** entry, never editing the original)
- Payroll: Dr Salary Expense · Cr Staff Payable, then Dr Staff Payable · Cr HQ Cash
- Commission: Dr Commission Expense · Cr Staff Payable
- Staff Fund contributions/loans/advances: as specified in §11

**Reversal:** `POST /api/v1/ledger/{entry}/reverse` never deletes. It creates a **new** `journal_entries` row with `is_reversal=true`, `reversed_entry_id` pointing at the original, and lines with debit/credit swapped. The original entry's lines are untouched — this is what makes the ledger auditable end-to-end. A `reversal_requests` record captures who asked and who approved it (see RBAC — reversal approval is a distinct permission from posting).

**Suspense:** the universal "unknown money" bucket, shared by unmatched repayments *and* stalled/ambiguous disbursement retries. Nothing sits un-ledgered — a payment that can't be matched is still Dr Cash / Cr Suspense the moment it's received; resolving it later is a second, separate journal entry.

**Real-time balances:** `account_balances` is a materialized cache updated by a model observer on `journal_entry_lines` insert (queued for high-volume branches, synchronous for the small system accounts like Reserve/Interest that the dashboard KPI strip reads every load).

---

## 6. Loan Engine Design

- **Full configurability, zero hardcoding:** every commercial term of a loan — min/max tenure, min/max amount, interest rate, interest formula, valid repayment schedules, grace period, E-Mandate requirement, and penalty configuration (type/rate/grace/cap) — lives exclusively on `loan_products` (+ `loan_product_repayment_schedules`). The loan engine's job is to *read* these values at application/approval/schedule-generation time; there is no fallback constant, default tenure, or default rate anywhere in application code. A Super Admin/Admin changing a product's terms takes effect immediately for new applications, with zero code deploy.
- **Type decision at application time:** `loan_products.requires_mandate` is snapshotted onto `loans.requires_mandate_snapshot` so a later product-config change never silently alters an in-flight loan. The same snapshot principle applies to `interest_rate_snapshot` and `penalty_rate_snapshot` (§2.5) — an in-flight loan is immune to a mid-term product edit.
- **Eligibility gate before application is even accepted:** `category_product_eligibility` must have a row for `(customer.customer_category_id, loan_product_id)`; `max_amount_override` caps the product's own `max_amount` if present. Additionally, the requested `repayment_schedule_id` must exist in `loan_product_repayment_schedules` for the chosen product — an application requesting a schedule the product doesn't support is rejected at validation (`422 SCHEDULE_NOT_SUPPORTED_BY_PRODUCT`), not silently coerced.
- **Schedule generation:** on manager approval, a `LoanScheduleGenerator` reads `interest_formulas.code` (Simple/Flat/Reducing) + `repayment_schedules.frequency_days` + `tenure_days` to produce `loan_schedules` rows. This is pure computation, no ledger posting yet (ledger only touches at disbursement).
- **Conditional mandate branch:** `requires_mandate_snapshot` decides whether the state machine visits `mandate_pending_otp → mandate_active/mandate_failed` or skips straight to `pending_credit_review`.
- **Disbursement is hybrid automated+manual:** the system prepares a batch (`disbursement_batches`, status `pending`) and calls the Vodacom API; a human still confirms in the external portal. The **callback** (`POST /webhooks/vodacom/disbursement-status`) is what actually flips the batch to `success`/`failed` — the system never assumes success from its own outbound call.
- **Retry:** on `failed`, a new `disbursement_batches` row is created with `attempt_number+1` and a fresh `batch_reference` (old batch is never mutated). After 3 failed attempts, loan status → `escalated`, requiring a manual decision (cancel / suspense / alternate channel) — all three are explicit endpoints, not implicit.
- **No ledger entry exists until a disbursement batch reaches `success`.**
- **Top-up eligibility:** a pure read-model check (paid % ≥ threshold AND no arrears) exposed as a dedicated endpoint the frontend calls before even showing a "Top Up" button.
- **Closure & freeze:** closing a loan sets `closed_at`; a freeze window (`frozen_until`) on the **customer** (not just the loan) blocks new applications until it lapses — enforced in the eligibility check, not just the UI.

---

## 7. Repayment Engine Design

- **Three intake channels, one allocation core:** Direct (webhook), Cash (teller→deposit→reconciliation), and manually-allocated Suspense resolutions all terminate in the same `AllocationService::allocate(payment, loanSchedules)` call — there is exactly one implementation of the Penalty→Interest→Principal rule in the codebase.
- **Reference matching:** webhook payload `reference` is looked up against `loans.loan_number`; a miss creates the payment with `status=unmatched` and an accompanying `suspense_items` row — it is never dropped.
- **Allocation walk:** iterate the loan's oldest unpaid `loan_schedules` rows in due-date order; within each installment, apply the incoming amount to `penalty_due → interest_due → principal_due` in that order before moving to the next installment. A `payment_allocations` row is written per installment touched, and exactly one `journal_entries` row per payment ties it together.
- **Partial payment:** whatever's left after the walk stays as the installment's outstanding due; if the due date has passed, the installment (and loan) is flagged `overdue`/`arrears`.
- **Overpayment:** excess beyond the total outstanding balance is **not** silently kept in a schedule row — it's routed to a customer wallet/advance credit (a `payment` marked with a special `channel`/note, no schedule attached) pending a refund-or-apply-to-next-loan decision by Finance.
- **Duplicate detection:** unique `transaction_id` at the DB level (`payments.transaction_id UQ`) plus an idempotency-key check on the webhook endpoint — belt and suspenders against the docs' "duplicate payment → ignore/flag" rule.
- **Cash flow specifics:** `cash_deposits` exists precisely because teller cash-in-hand and bank-confirmed cash are two different trust states; a payment stays `pending_verification` until `POST /finance/bank-reconciliation` matches it to a real deposit slip.
- **Overdue/penalty cron:** a scheduled queue job (`penalty:apply`) walks `loan_schedules` past `due_date` with `status != paid`, applies `loan_products.penalty_rate` after `penalty_grace_days`, logs a `penalty_runs` row, and posts the Dr Loan Arrears / Cr Expected Schedule entry.

---

## 8. Accounting Engine

The accounting engine is not a separate module from the Ledger Architecture (§5/§7) — it is the enforcement layer around it:

- `LedgerService` is the single write gateway; it validates debit=credit balance, resolves the correct `chart_of_accounts` row (including auto-resolving branch-scoped or dynamic accounts), and stamps `posted_at`/`created_by`.
- **Reconciliation jobs** (queued, daily) compare: Bank statement import vs. `journal_entry_lines` on bank accounts; Mobile money provider statement vs. webhook-sourced payments; Teller cash count vs. `cash_deposits`. Mismatches surface as flagged rows in the Reconciliation report (§9 of the frontend reporting module), never auto-corrected.
- **Month-end close:** a queued job computes `Profit = Income accounts − Expense accounts (Reserve already netted out)` per branch, posts the Profit Account entry, and is the trigger that unlocks the Commission Engine (§11) for that period — commission literally cannot be computed before month-end close runs.
- **Immutability enforcement:** `journal_entries`/`journal_entry_lines` models override `delete()`/`update()` (Eloquent) to throw, so even a raw Artisan tinker session can't quietly violate "no delete, only reversal."

---

## 9. Customer Lifecycle

```
Registration started (branch officer)
   → NIDA lookup (POST /customers/nida-lookup) → auto-fills name/DOB/gender
   → OTP sent by NIDA → OTP verified (POST /customers/nida-otp-verify) → nida_verified_at set
   → Additional data captured (bank details, marital status, structured residence)
   → Face/Liveness capture (POST /customers/{id}/face-verify) → face_verified_at set
   → Customer Category assigned → dynamic_form_schema rendered → dynamic_form_data captured
   → KYC checklist evaluated (nida + otp + face + additional data + category, all present)
        → kyc_status = 'completed'
   → Customer can now be attached to a Loan Application (blocked otherwise)

Ongoing: status can move active → suspended (manual) or → frozen (fraud/investigation,
account_freezes row created) at any point; frozen customers are blocked from new loans
but existing loans continue their own state machine untouched.
```

---

## 10. Loan Lifecycle (state machine)

```
draft
  → pending_manager_approval  [POST /loans]
      → rejected [terminal]                                (manager rejects)
      → (requires_mandate=true)  mandate_pending_otp        (manager approves, product needs mandate)
           → mandate_failed → (retry) mandate_pending_otp
           → mandate_active → pending_credit_review
      → (requires_mandate=false) pending_credit_review      (manager approves, no mandate needed)
  → pending_finance            [telco verification success]
  → awaiting_disbursement       [POST /loans/{id}/prepare-disbursement]
  → disbursement_failed ⇄ escalated (after 3 retries)        [webhook callback]
  → active                                                   [webhook callback success; ledger posts here]
  → arrears (schedule overdue) ⇄ active (caught up)
  → defaulted → written_off | recovered
  → closed  [POST /loans/{id}/close]
  → frozen  (post-closure cooldown window on the customer, not a loan status branch per se)
```
Every transition writes a `loan_status_history` row — this is the audit trail the docs insist on ("kila action recorded").

---

## 11. Staff Lifecycle

```
HR registers staff (users + staff_profiles created together)
   → system auto-provisions ledger touchpoints: no new physical tables needed,
     staff_profile_id becomes a filterable dimension on journal_entry_lines
     (Staff Control / Staff Loan / Staff Advance / Staff Deductions are views, not tables)

Monthly cycle:
   Month-end close (Accounting Engine) →
   Commission Engine computes commission_pools per branch (Branch Profit − Loss Carry Forward,
     HQ 2% hold, Distributable Profit × pool %) →
   commission_distributions computed per staff (weighted by base_salary share) →
   zone_commission_distributions computed per zone manager (% of branch pools they oversee) →
   Payroll run generated (payroll_runs draft) pulling base + commission + allowances − deductions →
   HR/Finance finalizes (payroll_runs.status = finalized) → ledger posts Dr Salary Expense/Cr Staff Payable →
   Payment executed → Dr Staff Payable / Cr HQ Cash

Staff Loan / Advance: request → approval (HR) → disbursement (Finance only, never HR) →
  automatic payroll deduction until recovered — mirrors the customer loan engine internally.

Hard rule enforced at the service layer: commission_distributions for a branch/period
cannot be created while commission_pools.distributable_profit <= 0 (loss must be offset first).
```

---

## 12. Branch Architecture

- `branches.type` distinguishes `main` vs `sub`; `parent_branch_id` lets a sub-branch roll up into a main branch for reporting.
- Every branch gets an auto-created Teller Cash chart-of-accounts row (`branch_id` populated) at creation — this is what lets Branch P&L and Branch Ledger reports work as simple filtered queries.
- `zones` group branches for Zone Manager oversight (commission override scoping); `regions` (already needed for customer address data) double as the Regional Manager's oversight grouping via `branches.region_id` — two independent oversight hierarchies over the same branch set, matching how zone-based commission and region-based operational review are actually different concerns in the business.
- **HQ is a special Branch record, not a separate table.** `branches.is_head_office` (boolean) marks exactly one row as HQ — enforced at the application layer (a single-row constraint, since MySQL can't natively enforce "at most one TRUE" without a generated/unique-partial-index workaround the app validates anyway). HQ reuses the exact same ledger machinery, Teller Cash account, expense tagging, and staff assignment as any branch — no parallel code path.
- **Reporting implication:** every branch-scoped report (P&L, cashflow, expense) runs unchanged against the HQ row like any other branch. An "HQ-wide" report is simply the same report with `branch_id` filter omitted (aggregate across all branches) or explicitly scoped `is_head_office=true` when the HQ-only view is wanted — both are query variants of one report definition, not two separate report engines.

---

## 13. Multi-Branch Permissions

Default posture: **every role is branch-scoped unless explicitly granted otherwise.** Every branch-scoped table (`customers`, `loans`, `payments`, `staff_profiles`, journal lines via `branch_id`) is queried through a global Eloquent scope restricting results to `auth()->user()->branch_id`.

- **Credit Officer is strictly branch-scoped, no exceptions.** They review/verify loans only within their own `branch_id`. There is no permission that lifts this — cross-branch credit review is a Zone/Regional/HQ function, never a Credit Officer one.
- **Zone Manager** scope resolves to `branches.zone_id = user.zone_id` — a middle tier between one branch and all branches.
- **Regional Manager** scope resolves to `branches.region_id = user.region_id` — a separate oversight axis from Zone (regions are geographic, zones are commission/oversight groupings; the same branch set is sliced two different ways).
- **HQ roles** (Super Admin, Admin, Finance) see all branches by virtue of role, since their functions (org setup, disbursement, payroll) are inherently cross-branch.
- **Cross-branch *loan review* is never implied by scope alone — it requires the explicit `loans.review_cross_branch` permission**, granted independently of the zone/region/HQ scope above. A Zone Manager or Regional Manager can *see* branch performance data for branches in their zone/region by default, but cannot review or act on an individual loan outside their own branch unless this permission is separately attached to their role (or, if you want per-user granularity later, to the individual user). This keeps "visibility into aggregate branch numbers" and "authority to act on a specific loan" as two distinct grants, per the decision that cross-branch review must be explicit, not automatic.
- **Cross-branch actions** (e.g. HQ-paid-but-branch-tagged expenses) are explicit: the expense record carries both a `branch_id` (who it's tagged to) and is entered by an HQ user — the scope check is on *who can enter*, the *tag* is just data.
- Attempting to access another branch's record without the appropriate scope or explicit permission returns `403` with `error_code: BRANCH_SCOPE_VIOLATION`, logged to `audit_logs` — cross-branch snooping attempts are themselves an auditable event.

---

## 14. RBAC Roles & Permissions

| Role | Scope | Key permissions |
|---|---|---|
| **Super Admin** | All branches | Everything, incl. reversal approval, role management |
| **Admin** | All branches | Org setup (branches, products, categories), user management, no ledger reversal approval |
| **Finance** | All branches (money ops) | Disbursement execution, payment confirmation, bank reconciliation, payroll finalization, reversal request approval |
| **Branch Manager** | Own branch | Loan approval, staff advance approval, branch expense entry |
| **Loan Officer** | Own branch | Create loan application, capture KYC, cannot approve own submissions |
| **Credit Officer** | Own branch — **always, no cross-branch exception** | Telco verification step, modify/reject at credit review |
| **HR** | All branches | Staff registration, payroll generation (not finalization), performance records |
| **Zone Manager** | Own zone (branches where `branch.zone_id = user.zone_id`) | Read branch/commission performance in-zone by default; cross-branch **loan review** only with `loans.review_cross_branch` explicitly granted |
| **Regional Manager** | Own region (branches where `branch.region_id = user.region_id`) | Read branch performance in-region by default; cross-branch **loan review** only with `loans.review_cross_branch` explicitly granted |
| **Teller** | Own branch | Cash payment entry only, no reconciliation, no reversal |
| **Auditor** | All branches (read-only) | View-only: ledger, treasury, HR, customers, loans, repayments, reports, full audit trail (`audit.view`). Holds no manage/approve/finalize/reverse permission anywhere — independent oversight, not an operational role |

Permissions are granular strings (`loans.approve`, `loans.review_cross_branch`, `ledger.reverse.request`, `ledger.reverse.approve`, `payroll.generate`, `payroll.finalize`, `disbursement.retry`, `branches.view_all`, `audit.view`, …) attached to roles via `role_has_permissions`, checked with Laravel Policies per model plus explicit ability checks on Sanctum tokens so a compromised token can't be replayed to call an endpoint outside the issuing user's role. `loans.review_cross_branch` is deliberately **not** bundled into the Zone Manager / Regional Manager / HQ roles by default — it's an explicit additional grant per Decision 1, so cross-branch loan review is always a conscious, auditable authorization choice rather than an assumed side effect of org hierarchy.

**Separation-of-duties rules directly from the docs, enforced as authorization checks, not just UI hiding:**
- The officer who created a loan application cannot also record its manager approval.
- HR can generate payroll but not finalize/pay it (Finance does).
- Reversal *request* and reversal *approval* are different permissions, held by different roles (Branch Manager can request, only Finance/Super Admin approve).
- All disbursements execute through Finance regardless of who prepared the batch.

---

## 15. API Architecture

All endpoints are prefixed `/api/v1`. Standard CRUD resources (branches, bank accounts, interest formulas, loan products, customer categories, repayment schedules, expense categories, users, zones) follow one repeated pattern, described once here rather than per-resource:

**Standard CRUD pattern** (e.g. `/loan-products`):
| Method | Path | Notes |
|---|---|---|
| GET | `/loan-products` | Paginated list, `?search=&status=&per_page=` |
| POST | `/loan-products` | Validated create; 201 + resource |
| GET | `/loan-products/{id}` | 404 if not found or soft-deleted |
| PUT | `/loan-products/{id}` | Full update; blocked (409) if the product has active loans and the change affects `interest_formula_id`/`requires_mandate` |
| DELETE | `/loan-products/{id}` | Soft delete; blocked (409) if referenced by any non-closed loan |

Validation errors → `422` with `errors` map; not-found → `404` with `error_code: RESOURCE_NOT_FOUND`; permission failure → `403` with `error_code: FORBIDDEN`.

### 15.1 Customer & KYC
| Method | Path | Purpose |
|---|---|---|
| POST | `/customers/nida-lookup` | Fetch name/DOB/gender/photo from NIDA by `nida_number`, triggers OTP send |
| POST | `/customers/nida-otp-verify` | Verify OTP; sets `nida_verified_at` |
| POST | `/customers` | Create customer record (requires NIDA+OTP already verified) |
| POST | `/customers/{id}/additional-data` | Bank details, marital status, structured residence |
| POST | `/customers/{id}/face-verify` | Upload liveness capture; sets `face_verified_at` |
| PUT | `/customers/{id}/category` | Assign `customer_category_id`; renders/validates `dynamic_form_data` against schema |
| GET | `/customers/{id}/kyc-status` | Returns checklist booleans + overall `kyc_status` |

**Example — `POST /customers/nida-otp-verify`**
Request: `{ "nida_number": "199001...", "otp": "482910" }`
Response 200: `{ "data": { "verified": true, "customer_draft": { "first_name": "...", "dob": "...", "gender": "female" } } }`
Errors: `422 { "error_code": "INVALID_OTP" }`, `429 { "error_code": "OTP_ATTEMPTS_EXCEEDED" }`

### 15.2 Loan Origination
| Method | Path | Purpose |
|---|---|---|
| POST | `/loans` | Officer submits application |
| POST | `/loans/{id}/approve-manager` | `{ "decision": "approve"|"reject"|"modify", "reason": "..." }` |
| POST | `/bank/e-mandate` | Create mandate, sends bank OTP |
| POST | `/bank/e-mandate/verify-otp` | `{ "loan_id", "otp" }` |
| POST | `/vodacom/kyc-verify` | Credit officer telco check |
| POST | `/loans/{id}/prepare-disbursement` | Finance generates `disbursement_batches` row |
| POST | `/vodacom/disbursement-request` | Triggers outbound Vodacom call |
| POST | `/webhooks/vodacom/disbursement-status` | Signed callback; flips batch + loan status, posts ledger on success |
| POST | `/loans/{id}/retry-disbursement` | Max 3; new batch_reference each time |
| GET | `/loans/{id}/topup-eligibility` | Read-only eligibility check |
| POST | `/loans/{id}/close` | Closes loan, starts customer freeze window |

**Example — `POST /loans`**
Request:
```json
{
  "customer_id": 4821,
  "loan_product_id": 3,
  "repayment_schedule_id": 2,
  "principal_amount": 500000,
  "tenure_days": 90
}
```
Validation: `customer_id` must have `kyc_status=completed`; `loan_product_id` must appear in `category_product_eligibility` for the customer's category; `principal_amount` between product `min_amount`/`max_amount` (or `max_amount_override`); customer must not be `frozen`.
Response 201: `{ "data": { "id": 991, "loan_number": "LN-2026-000991", "status": "pending_manager_approval", "schedule_preview": [ ... ] } }`
Errors: `422 { "errors": { "principal_amount": ["Exceeds product maximum of 800,000"] } }`, `403 { "error_code": "CATEGORY_NOT_ELIGIBLE_FOR_PRODUCT" }`, `423 { "error_code": "CUSTOMER_FROZEN", "message": "Customer is frozen until 2026-09-01" }`

### 15.3 Repayments & Collections
| Method | Path | Purpose |
|---|---|---|
| POST | `/webhooks/payments` | Provider-signed inbound payment (mobile/bank) |
| POST | `/payments/unmatched` | Manually log an unmatched payment |
| GET | `/payments/suspense` | List unresolved suspense items |
| POST | `/payments/allocate` | Finance allocates a suspense item to a loan |
| POST | `/payments/cash` | Teller records cash payment |
| POST | `/finance/bank-reconciliation` | Upload/match bank statement to teller deposits |
| POST | `/payments/confirm` | Confirms a pending-verification payment |
| POST | `/loans/overdue/process` | Cron-triggered penalty application (also manually invokable by Finance) |

**Example — `POST /webhooks/payments`**
Request: `{ "reference": "LN-2026-000991", "amount": 50000, "phone": "2557XXXXXXX", "channel": "VODACOM", "transaction_id": "TXN00123" }`
Response 200: `{ "data": { "payment_id": 5510, "status": "allocated", "allocation": [ { "installment": 4, "penalty": 2000, "interest": 18000, "principal": 30000 } ] } }`
If reference doesn't match: `200 { "data": { "payment_id": 5511, "status": "unmatched" } }` (still 200 — the payment was successfully received and ledgered to Suspense, it's just unmatched, not an error)
Duplicate `transaction_id`: `409 { "error_code": "DUPLICATE_TRANSACTION" }`

### 15.4 Ledger & Treasury
| Method | Path | Purpose |
|---|---|---|
| GET | `/ledger/accounts` | Chart of accounts + live balances |
| GET | `/ledger/accounts/{id}/entries` | Journal lines for one account (paginated) |
| GET | `/ledger/customers/{id}` / `/ledger/loans/{id}` / `/ledger/staff/{id}` / `/ledger/branches/{id}` | Sub-ledger views (filtered journal lines) |
| POST | `/ledger/{entry}/reverse` | `{ "reason": "..." }` — creates `reversal_requests`, requires `ledger.reverse.request` |
| POST | `/ledger/reversals/{id}/approve` | Requires `ledger.reverse.approve` (different role) |

### 15.5 HR, Payroll & Commission
| Method | Path | Purpose |
|---|---|---|
| POST | `/staff` | HR registers staff |
| POST | `/payroll/generate` | `{ "period": "2026-08" }` — computes lines, status stays `draft` |
| POST | `/payroll/{run}/finalize` | Finance-only; posts ledger, status → `finalized` |
| POST | `/staff/advance/request` | `{ "staff_profile_id", "amount" }` |
| POST | `/staff/advance/approve` | HR/Branch Manager |
| POST | `/staff/performance` | Manager records targets/achieved/rating |
| GET | `/commission/branches/{id}` | Commission pool + distribution breakdown for a period |

### 15.6 Reporting (read-only, all GET, all support `?branch_id=&period=&from=&to=`)
`/reports/portfolio`, `/reports/repayment`, `/reports/arrears`, `/reports/recovery`, `/reports/cashflow`, `/reports/branch-pnl`, `/reports/branch-efficiency`, `/reports/hq-cashflow`, `/reports/payroll`, `/reports/commission`, `/reports/zone-commission`, `/reports/financial-statements`, `/reports/audit-trail`, `/reports/suspense`, `/reports/reversals`, `/reports/daily-collection`, `/reports/daily-disbursement`, `/reports/branch-ranking`, `/reports/segmentation`, `/reports/age-analysis`, `/reports/repayment-behavior` (DPD buckets + A/B/C/D scoring).

Every report endpoint returns `{ "data": [...], "meta": { "generated_at": "...", "filters_applied": {...} } }` — reports are never cached longer than the queue job that recomputes `customer_risk_scores`/`account_balances`, so numbers on screen are traceable to a specific computation timestamp.

---

## Architecture Finalized

All previously open items are now resolved:
- **Credit Officer** is strictly branch-scoped; HQ, Regional Managers, and Zone Managers can review loans cross-branch only via the explicit `loans.review_cross_branch` permission (§13, §14).
- **HQ** is a Branch record flagged `is_head_office` (§2.2, §12) — no separate table; reporting aggregates HQ like any branch, with a dedicated HQ-wide query variant.
- **Loan Products** are fully configurable end-to-end (§2.3, §6): tenure, amount, interest rate/formula, valid repayment schedules, grace period, mandate requirement, and penalty configuration all live on `loan_products` / `loan_product_repayment_schedules`, with zero hardcoded values in application code.

**Addendum (post-Phase-1 authentication hardening):**
- Added an **Auditor** role (§14): read-only, cross-branch, no manage/approve/finalize/reverse permission anywhere — independent of the operational roles above.
- Clarified that `users.branch_id` is populated for every user including HQ-wide roles (they're based at the Head Office branch); cross-branch visibility is decided solely by the `branches.view_all` permission, never by a null branch assignment.

This backend specification is considered final pending real-world implementation feedback. The Frontend Technical Specification is the next deliverable.
