import { CheckCircle2 } from "lucide-react";
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
    getExpenseRequests({ scope: "branch", status: "approved" }),
    getBranches(),
  ]);

  return (
    <>
      <PageHeader
        icon={CheckCircle2}
        title="All Approved Expenses"
        description="Branch expense requests that have been approved and released."
        breadcrumb={[{ label: "Expenses", href: "/expenses/register" }, { label: "All Approved Expenses" }]}
      />
      <SectionNav items={expensesNavFor(user)} />
      <ExpenseClaimsPanel
        claims={claims}
        scope="branch"
        decidable={false}
        title="Accepted Expenses List"
        description="Approved and released. This list is the record of branch spend."
        emptyTitle="Nothing approved yet"
        emptyDescription="An approved request moves here from All Expenses Request."
        branches={branches.map((b) => b.name)}
      />
    </>
  );
}
