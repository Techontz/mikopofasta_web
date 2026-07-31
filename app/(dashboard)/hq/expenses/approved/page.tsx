import { CheckCircle2 } from "lucide-react";
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

    const { claims } = await getExpenseRequests({ scope: "headquarters", status: "approved" });

  return (
    <>
      <PageHeader
        icon={CheckCircle2}
        title="All Approved Expenses"
        description="Head-office expense requests that have been approved and released."
        breadcrumb={[{ label: "Headquarters Expenses", href: "/hq/expenses/register" }, { label: "All Approved Expenses" }]}
      />
      <SectionNav items={hqExpensesNavFor(user)} />
      <ExpenseClaimsPanel
        claims={claims}
        scope="headquarters"
        decidable={false}
        title="Headquarters Approved Expenses"
        description="Approved and released. This list is the record of head-office spend."
        emptyTitle="Nothing approved yet"
        emptyDescription="An approved request moves here from All Expenses Requested."
      />
    </>
  );
}
