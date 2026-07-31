import { Receipt } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { expensesNavFor } from "@/features/ledger/nav-items";
import { getExpenseCategories } from "@/lib/api/expenses";
import { ExpenseNamesPanel } from "@/features/operations/expense-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  // Filtered server-side: the two registers are separate books, and fetching
  // both to discard one would let a head-office name flash on a branch screen.
  const names = await getExpenseCategories({ scope: "branch" });

  return (
    <>
      <PageHeader
        icon={Receipt}
        title="Register Branch Expenses"
        description="The named things a branch can spend against. A request is filed under one of these."
        breadcrumb={[{ label: "Expenses", href: "/expenses/register" }, { label: "Register Branch Expenses" }]}
      />
      <SectionNav items={expensesNavFor(user)} />
      <ExpenseNamesPanel
        names={names}
        scope="branch"
        title="Expenses"
        description="Branch expense names. Editing one renames it for future requests."
      />
    </>
  );
}
