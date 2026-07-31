import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { expensesNavFor } from "@/features/ledger/nav-items";
import { getExpenseRequests } from "@/lib/api/expenses";
import { getBranches } from "@/lib/api/organization";
import { ExpenseClaimsPanel } from "@/features/operations/expense-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

    /*
   * Two reads, in parallel — the queue itself and the branch register the
   * filter offers. Sequential would make the page wait for the second before
   * starting the first for no reason; neither depends on the other.
   */
  const [{ claims }, branches] = await Promise.all([
    getExpenseRequests({ scope: "branch" }),
    getBranches(),
  ]);

  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title="All Expenses Request"
        description="Expense requests raised by branches, and what was decided on each."
        breadcrumb={[{ label: "Expenses", href: "/expenses/register" }, { label: "All Expenses Request" }]}
      />
      <SectionNav items={expensesNavFor(user)} />
      <ExpenseClaimsPanel
        claims={claims}
        scope="branch"
        decidable={true}
        title="Request Expenses"
        description="Raised by a branch and waiting on a decision, or already decided."
        emptyTitle="No expense requests yet"
        emptyDescription="A request appears here as soon as a branch raises one."
        branches={branches.map((b) => b.name)}
      />
    </>
  );
}
