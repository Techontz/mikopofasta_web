import { Receipt } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { getBankAccounts } from "@/lib/api/bank";
import { getExpenseCategories, getExpenseRequests } from "@/lib/api/expenses";
import { ExpensesPanel } from "@/features/bank/expenses-panel";

export default async function RegisterBankExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  /*
   * A bank expense is an ordinary expense request with a bank account named on
   * it, so this reads the Expenses endpoints and keeps only the rows that name
   * one. Head office's register, because a bank account is the company's rather
   * than any branch's.
   */
  const [{ claims }, categories, { accounts }] = await Promise.all([
    getExpenseRequests({ scope: "headquarters" }),
    getExpenseCategories({ scope: "headquarters" }),
    getBankAccounts({ status: "active" }),
  ]);

  const expenses = claims
    .filter((c) => c.bankAccountId !== null)
    .map((c) => ({
      id: c.id,
      category: c.expense,
      bankName: c.bankName ?? "",
      accountName: c.bankAccountName ?? "",
      amount: c.amount,
      description: c.description,
      // No upload endpoint exists, so no receipt is ever stored — the form is
      // explicit about capturing the name only.
      receiptName: null,
      date: c.date,
      recordedBy: c.staff,
    }));

  return (
    <>
      <PageHeader
        icon={Receipt}
        title="Register Bank Expenses"
        description="Costs paid out of a bank account — charges, salaries, rent. Recording one here is what puts it against that account."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Register Bank Expenses" }]}
      />
      <SectionNav items={treasuryNavFor(user)} />
      <ExpensesPanel
        expenses={expenses}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        accounts={accounts.map((a) => ({
          id: a.id,
          bankName: a.bankName,
          accountName: a.accountName,
          status: a.status,
        }))}
        bankNames={[...new Set(accounts.map((a) => a.bankName))].sort()}
      />
    </>
  );
}
