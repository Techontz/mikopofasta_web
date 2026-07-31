import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/settings";
import { getExpenseCategories } from "@/lib/api/expenses";
import { ExpenseCategoriesTable } from "@/features/admin/expense-categories/categories-table";

export default async function ExpenseCategoriesPage() {
  /*
   * Both registers, with balances. This is the only expense screen that shows
   * what has been spent per category, and it is the reason `with_balances`
   * exists as an opt-in: summing them is a second query per row, and the two
   * operational register screens never display it.
   */
  const categories = await getExpenseCategories({ withBalances: true });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Receipt}
        title="Expense Categories"
        description="Branch and head-office expense classifications and the ledger account each one posts to."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Expense Categories" }]}
      />
      <ExpenseCategoriesTable categories={categories} />
    </div>
  );
}
