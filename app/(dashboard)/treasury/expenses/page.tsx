import { Receipt } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { MOCK_BANK_EXPENSES } from "@/lib/mock-data/bank";
import { ExpensesPanel } from "@/features/bank/expenses-panel";

export default async function RegisterBankExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Receipt}
        title="Register Bank Expenses"
        description="Costs paid out of a bank account — charges, salaries, rent. Recording one here is what puts it against that account."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Register Bank Expenses" }]}
      />
      <SectionNav items={treasuryNavFor(user)} />
      <ExpensesPanel expenses={MOCK_BANK_EXPENSES} />
    </>
  );
}
