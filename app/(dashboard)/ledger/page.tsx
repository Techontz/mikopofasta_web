import { CheckCircle2, Scale, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney } from "@/lib/domain/money";
import { buildTrialBalance } from "@/lib/domain/trial-balance";
import { CHART_OF_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { MOCK_JOURNAL_ENTRIES, MOCK_JOURNAL_ENTRY_LINES } from "@/lib/mock-data/journal-entries";
import { SectionNav } from "@/features/ledger/section-nav";
import { ledgerNavFor } from "@/features/ledger/nav-items";
import { AccountsTable, type AccountRow } from "@/features/ledger/accounts-table";

export default async function LedgerPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.LEDGER_VIEW)) return <AccessDeniedState />;

  const trial = buildTrialBalance(CHART_OF_ACCOUNTS, MOCK_JOURNAL_ENTRY_LINES);
  const rows: AccountRow[] = trial.rows.map((r) => ({
    accountId: r.accountId,
    code: r.code,
    name: r.name,
    type: r.type,
    kind: r.isSystem ? "System" : "Dynamic",
    debitTotal: r.debitTotal,
    creditTotal: r.creditTotal,
    balance: r.balance,
  }));

  const reversalCount = MOCK_JOURNAL_ENTRIES.filter((e) => e.isReversal).length;

  return (
    <div className="space-y-6">
      <div>
        <h1>Ledger</h1>
        <p className="text-sm text-muted-foreground">
          The single source of truth. Entries are immutable — money is only ever undone by posting a reversal.
        </p>
      </div>

      <SectionNav items={ledgerNavFor(user)} />

      <div
        className={
          trial.balanced
            ? "flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
            : "flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        }
      >
        {trial.balanced ? <CheckCircle2 className="size-4 shrink-0" aria-hidden /> : <TriangleAlert className="size-4 shrink-0" aria-hidden />}
        <span>
          {trial.balanced
            ? `Trial balance is in balance — debits and credits both total ${formatMoney(trial.totalDebits)}.`
            : `Trial balance is OUT by ${formatMoney(Math.abs(trial.totalDebits - trial.totalCredits))} — investigate immediately.`}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Debits" value={formatMoney(trial.totalDebits)} />
        <Stat label="Total Credits" value={formatMoney(trial.totalCredits)} />
        <Stat label="Journal Entries" value={String(MOCK_JOURNAL_ENTRIES.length)} />
        <Stat label="Reversal Entries" value={String(reversalCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chart of Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountsTable accounts={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Scale className="size-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent>
        <div className="font-tabular text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
