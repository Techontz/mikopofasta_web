import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { hqExpensesNavFor } from "@/features/ledger/nav-items";
import { getExpenseRequests } from "@/lib/api/expenses";
import { ExpenseClaimsPanel } from "@/features/operations/expense-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

    const { claims } = await getExpenseRequests({ scope: "headquarters" });

  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title="All Expenses Requested"
        description="Expense requests raised by head-office staff."
        breadcrumb={[{ label: "Headquarters Expenses", href: "/hq/expenses/register" }, { label: "All Expenses Requested" }]}
      />
      <SectionNav items={hqExpensesNavFor(user)} />
      <ExpenseClaimsPanel
        claims={claims}
        scope="headquarters"
        decidable={true}
        title="Headquarters Recommended Expenses"
        description="Raised by head-office staff and waiting on a decision, or already decided."
        emptyTitle="No expense requests yet"
        emptyDescription="A request appears here as soon as a member of staff raises one."
      />
    </>
  );
}
