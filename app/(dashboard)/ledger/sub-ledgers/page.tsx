import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { CHART_OF_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { MOCK_JOURNAL_ENTRIES, MOCK_JOURNAL_ENTRY_LINES } from "@/lib/mock-data/journal-entries";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/staff-profiles";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { customerFullName } from "@/types/customer";
import { SectionNav } from "@/features/ledger/section-nav";
import { ledgerNavFor } from "@/features/ledger/nav-items";
import { SubLedgerExplorer, type SubLedgerDimension, type SubLedgerLine, type SubLedgerOption } from "@/features/ledger/sub-ledger-explorer";

export default async function SubLedgersPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.LEDGER_VIEW)) return <AccessDeniedState />;

  const entryIndex = new Map(MOCK_JOURNAL_ENTRIES.map((e) => [e.id, e]));
  const accountIndex = new Map(CHART_OF_ACCOUNTS.map((a) => [a.id, a]));
  const userNames = Object.fromEntries(MOCK_USERS.map((u) => [u.id, u.name]));

  const lines: SubLedgerLine[] = MOCK_JOURNAL_ENTRY_LINES.filter(
    (l) => l.customerId || l.loanId || l.staffProfileId || l.branchId
  ).map((l) => {
    const entry = entryIndex.get(l.journalEntryId);
    const account = accountIndex.get(l.accountId);
    return {
      id: l.id,
      entryId: l.journalEntryId,
      entryNumber: entry?.entryNumber ?? "—",
      entryDate: entry?.entryDate ?? "—",
      description: entry?.description ?? "—",
      accountCode: account?.code ?? "—",
      accountName: account?.name ?? "—",
      debit: l.debitAmount,
      credit: l.creditAmount,
      customerId: l.customerId,
      loanId: l.loanId,
      staffProfileId: l.staffProfileId,
      branchId: l.branchId,
    };
  });

  // Only offer subjects that actually have postings — an empty picker entry
  // is just noise in an ops tool.
  const withLines = (pick: (l: SubLedgerLine) => string | null) => new Set(lines.map(pick).filter(Boolean) as string[]);
  const customerIds = withLines((l) => l.customerId);
  const loanIds = withLines((l) => l.loanId);
  const staffIds = withLines((l) => l.staffProfileId);
  const branchIds = withLines((l) => l.branchId);

  const options: Record<SubLedgerDimension, SubLedgerOption[]> = {
    customer: MOCK_CUSTOMERS.filter((c) => customerIds.has(c.id)).map((c) => ({
      id: c.id,
      label: `${c.customerNumber} — ${customerFullName(c)}`,
    })),
    loan: MOCK_LOANS.filter((l) => loanIds.has(l.id)).map((l) => ({ id: l.id, label: l.loanNumber })),
    staff: MOCK_STAFF_PROFILES.filter((s) => staffIds.has(s.id)).map((s) => ({
      id: s.id,
      label: `${s.employeeNumber} — ${userNames[s.userId] ?? s.userId}`,
    })),
    branch: MOCK_BRANCHES.filter((b) => branchIds.has(b.id)).map((b) => ({ id: b.id, label: b.name })),
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

      <SubLedgerExplorer options={options} lines={lines} />
    </div>
  );
}
