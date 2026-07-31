import { CheckCircle2, ClipboardList, Sigma, XCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader, StatCard } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { formatMoney, round2 } from "@/lib/domain/money";
import { MOCK_EXPENSE_REQUESTS } from "@/lib/mock-data/bank";
import { ExpenseRequestsPanel } from "@/features/bank/expense-requests-panel";

export default async function RequestExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  const requests = MOCK_EXPENSE_REQUESTS;
  const by = (status: string) => requests.filter((r) => r.status === status);
  const pending = by("pending");
  const approved = by("approved");
  const rejected = by("rejected");

  /*
   * "Total Amount" counts what has actually been committed — approved requests
   * only. Summing every row would fold rejected money into a figure that reads
   * as spend, which is the kind of total someone budgets against.
   */
  const committed = round2(approved.reduce((s, r) => s + r.amount, 0));

  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title="Request Expenses"
        description="Expense requests from branches. Approving one commits the money; the figures below count only what has been committed."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Request Expenses" }]}
      />
      <SectionNav items={treasuryNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending Requests"
          value={pending.length}
          icon={ClipboardList}
          tone="accent"
          hint={pending.length > 0 ? `${formatMoney(round2(pending.reduce((s, r) => s + r.amount, 0)))} awaiting a decision` : "Nothing awaiting a decision"}
        />
        <StatCard label="Approved" value={approved.length} icon={CheckCircle2} />
        <StatCard label="Rejected" value={rejected.length} icon={XCircle} />
        <StatCard label="Total Amount" value={formatMoney(committed)} icon={Sigma} hint="Approved requests only" />
      </div>

      <ExpenseRequestsPanel requests={requests} />
    </>
  );
}
