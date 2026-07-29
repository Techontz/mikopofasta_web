import { AlertTriangle, Banknote, ClipboardList, Landmark, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney } from "@/lib/domain/money";
import { ORIGINATION_STATUSES, OPEN_BOOK_STATUSES } from "@/lib/domain/loan-status-machine";
import { getAllLoans, getOutstandingByLoan } from "@/lib/api/loans";
import { LoansTable } from "@/features/loans/loans-table";
import { toLoanRow } from "@/features/loans/queries";

export default async function LoansPage() {
  const user = await getCurrentUser();
  // Already narrowed to this officer's branch — §13 scoping is the API's.
  const loans = await getAllLoans();

  const inOrigination = loans.filter((l) => ORIGINATION_STATUSES.includes(l.status));
  const openBook = loans.filter((l) => OPEN_BOOK_STATUSES.includes(l.status));

  // The list resource carries no balance, so the open book's outstanding is
  // resolved separately and feeds both the tile and the table's column.
  const outstanding = await getOutstandingByLoan(openBook);
  const rows = loans.map((loan) => toLoanRow(loan, outstanding.byLoan));
  const inArrears = loans.filter((l) => l.status === "arrears" || l.status === "defaulted");
  const needsAttention = loans.filter((l) => l.status === "disbursement_failed" || l.status === "escalated");

  const tiles = [
    { label: "Active Book", value: String(openBook.length), icon: Landmark },
    {
      label: outstanding.complete ? "Portfolio Outstanding" : "Portfolio Outstanding (partial)",
      value: formatMoney(outstanding.total),
      icon: Banknote,
    },
    { label: "In Origination", value: String(inOrigination.length), icon: ClipboardList },
    { label: "Arrears / Default", value: String(inArrears.length), icon: TrendingUp },
  ];

  const canCreate = user ? hasPermission(user, PERMISSIONS.LOANS_CREATE) : false;

  return (
    <div className="space-y-6">
      <div>
        <h1>Loans</h1>
        <p className="text-sm text-muted-foreground">Originate, review, disburse, and service the loan book.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tile.label}</CardTitle>
              <tile.icon className="size-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="font-tabular text-2xl font-semibold">{tile.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {needsAttention.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <span>
            {needsAttention.length} loan{needsAttention.length === 1 ? "" : "s"} need attention — a disbursement failed or was escalated.
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Loans</CardTitle>
        </CardHeader>
        <CardContent>
          <LoansTable loans={rows} canCreate={canCreate} />
        </CardContent>
      </Card>
    </div>
  );
}
