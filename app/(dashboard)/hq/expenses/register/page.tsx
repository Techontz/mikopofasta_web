import { Receipt } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { hqExpensesNavFor } from "@/features/ledger/nav-items";
import { getExpenseCategories } from "@/lib/api/expenses";
import { ExpenseNamesPanel } from "@/features/operations/expense-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  const names = await getExpenseCategories({ scope: "headquarters" });

  return (
    <>
      <PageHeader
        icon={Receipt}
        title="Register Expenses"
        description="The named things head office can spend against."
        breadcrumb={[{ label: "Headquarters Expenses", href: "/hq/expenses/register" }, { label: "Register Expenses" }]}
      />
      <SectionNav items={hqExpensesNavFor(user)} />
      <ExpenseNamesPanel
        names={names}
        scope="headquarters"
        title="Expenses"
        description="Head-office expense names, kept separately from the branch register."
      />
    </>
  );
}
