import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { getAllCustomers } from "@/lib/api/customers";
import { getAllLoans } from "@/lib/api/loans";
import { getBranches } from "@/lib/api/organization";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/staff-profiles";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { SectionNav } from "@/features/ledger/section-nav";
import { ledgerNavFor } from "@/features/ledger/nav-items";
import { SubLedgerExplorer, type SubLedgerDimension, type SubLedgerOption } from "@/features/ledger/sub-ledger-explorer";

export default async function SubLedgersPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.LEDGER_VIEW)) return <AccessDeniedState />;

  /*
   * Only the subject pickers are built here — the lines themselves are fetched
   * per subject once one is chosen, because `GET /ledger/{dimension}/{id}`
   * answers for one subject at a time. The page used to ship every posted line
   * to the browser and filter there, which would now mean downloading the whole
   * journal to look at a single loan.
   *
   * A consequence worth stating: the list can no longer be pre-filtered to
   * subjects that actually have postings, since that would require the journal
   * this page deliberately no longer loads. Picking one with none shows the
   * "no postings" empty state.
   *
   * Each lookup fails soft — a role that can read the ledger but not customers
   * gets a shorter picker rather than a broken page.
   */
  const [customers, loans, branches] = await Promise.all([
    getAllCustomers().catch(() => []),
    getAllLoans().catch(() => []),
    getBranches().catch(() => []),
  ]);

  const userNames = Object.fromEntries(MOCK_USERS.map((u) => [u.id, u.name]));

  const options: Record<SubLedgerDimension, SubLedgerOption[]> = {
    customer: customers.map((c) => ({ id: c.id, label: `${c.customerNumber} — ${c.fullName}` })),
    loan: loans.map((l) => ({ id: l.id, label: l.loanNumber })),
    // Staff profiles have no integrated API yet — HR is a later module.
    staff: MOCK_STAFF_PROFILES.map((s) => ({
      id: s.id,
      label: `${s.employeeNumber} — ${userNames[s.userId] ?? s.userId}`,
    })),
    branch: branches.map((b) => ({ id: b.id, label: b.name })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Sub-Ledgers</h1>
        <p className="text-sm text-muted-foreground">
          Customer, loan, staff, and branch ledgers are not separate tables — they are journal lines filtered by dimension.
        </p>
      </div>

      <SectionNav items={ledgerNavFor(user)} />

      <SubLedgerExplorer options={options} />
    </div>
  );
}
