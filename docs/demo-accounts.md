# Demo Accounts

Seeded in [`lib/mock-data/users.ts`](../lib/mock-data/users.ts) for Phase 1 mock authentication (`lib/auth/session.ts` / `lib/auth/actions.ts`). Every account uses password **`password`**. This is a dev-only sandbox — these credentials are meaningless once real Sanctum authentication (per `docs/frontend-technical-specification.md` §2) replaces the mock login.

Login at `/login` with the phone number below and password `password`.

## Roster

| Name | Phone | Role | Home Branch | Zone / Region |
|---|---|---|---|---|
| Amina Juma | `0754000001` | Super Admin | Head Office | — |
| Baraka Mushi | `0754000002` | Admin | Head Office | — |
| Catherine Massawe | `0754000003` | Finance Officer | Head Office | — |
| Daniel Kessy | `0754000004` | Branch Manager | Kakonko | — |
| Esther Mollel | `0754000005` | Loan Officer | Kakonko | — |
| Frank Urio | `0754000006` | Credit Officer | Missenyi | — |
| Grace Mbwana | `0754000007` | HR Officer | Head Office | — |
| Hamisi Ally | `0754000008` | Zone Manager | Kakonko | Zone: West |
| Irene Komba | `0754000009` | Regional Manager | Missenyi | Region: Kagera |
| Joseph Mrema | `0754000010` | Teller | Lindi | — |
| Khadija Ramadhani | `0754000011` | Auditor | Head Office | — |

Every user has a concrete home branch, including HQ-wide roles — they're based at **Head Office** (`br-hq`, `branches.is_head_office = true`), per the backend spec's Decision 2 (HQ is a branch, not a separate entity). Cross-branch visibility is decided entirely by the `branches.view_all` permission below, never by the branch field itself.

## Permissions & Sidebar Visibility Per Role

Sidebar nav items map 1:1 to a required permission (`config/route-permissions.ts`, mirrored in `config/nav.ts`) — Dashboard has none and is visible to everyone. This table is the expected result of the RBAC verification pass, not just a design intent.

| Role | Permissions granted | Sidebar nav visible |
|---|---|---|
| **Super Admin** | All permissions in the system | Dashboard, Customers, Loans, Repayments, Ledger, Treasury, HR & Payroll, Reports, Org Setup |
| **Admin** | `customers.view`, `customers.manage`, `loans.view`, `loans.approve`, `repayments.view`, `repayments.manage`, `ledger.view`, `ledger.reverse.request`, `treasury.view`, `hr.view`, `hr.manage`, `payroll.generate`, `reports.view`, `admin.org_settings`, `branches.view_all` | Dashboard, Customers, Loans, Repayments, Ledger, Treasury, HR & Payroll, Reports, Org Setup |
| **Finance Officer** | `customers.view`, `loans.view`, `repayments.view`, `repayments.manage`, `ledger.view`, `ledger.reverse.request`, `ledger.reverse.approve`, `treasury.view`, `payroll.finalize`, `reports.view`, `branches.view_all` | Dashboard, Customers, Loans, Repayments, Ledger, Treasury, Reports |
| **Branch Manager** | `customers.view`, `customers.manage`, `loans.view`, `loans.approve`, `repayments.view`, `reports.view` | Dashboard, Customers, Loans, Repayments, Reports |
| **Loan Officer** | `customers.view`, `customers.manage`, `loans.view`, `reports.view` | Dashboard, Customers, Loans, Reports |
| **Credit Officer** | `customers.view`, `loans.view`, `reports.view` | Dashboard, Customers, Loans, Reports |
| **HR Officer** | `hr.view`, `hr.manage`, `payroll.generate`, `reports.view` | Dashboard, HR & Payroll, Reports |
| **Zone Manager** | `customers.view`, `loans.view`, `repayments.view`, `reports.view`, `branches.view_all` **+ explicit grant:** `loans.review_cross_branch` | Dashboard, Customers, Loans, Repayments, Reports |
| **Regional Manager** | `customers.view`, `loans.view`, `repayments.view`, `reports.view`, `branches.view_all` | Dashboard, Customers, Loans, Repayments, Reports |
| **Teller** | `repayments.view` | Dashboard, Repayments & Collections |
| **Auditor** | `customers.view`, `loans.view`, `repayments.view`, `ledger.view`, `treasury.view`, `hr.view`, `reports.view`, `branches.view_all`, `audit.view` — **read-only, no manage/approve/finalize/reverse permission anywhere** | Dashboard, Customers, Loans, Repayments, Ledger, Treasury, HR & Payroll, Reports |

Notes on two deliberate design points these accounts exercise:

- **Hamisi Ally (Zone Manager)** carries `loans.review_cross_branch` as an *extra* permission, not a role default — demonstrating backend spec Decision 1: cross-branch loan review is always an explicit, individually-auditable grant, never implied by holding the Zone/Regional Manager role. Logging in as Irene Komba (Regional Manager, no extra grant) shows the same role tier *without* that permission for contrast.
- **Khadija Ramadhani (Auditor)** has the widest read-only reach in the system (8 of 9 nav sections) but zero write/approve/finalize/reverse permission — confirming view access and mutation authority are fully independent axes, not a single seniority ladder.

## Verifying a Role

1. Log in with the phone/password above.
2. Confirm the sidebar matches the "Sidebar nav visible" column exactly.
3. Try navigating directly (via URL) to a section *not* listed for that role — it should redirect to `/access-denied`, not render the page.
4. Confirm every section that *is* listed loads normally (currently a "coming soon" placeholder — Phase 1 ships the shell, not business modules).
5. Log out via the user menu and confirm it returns to `/login`.
