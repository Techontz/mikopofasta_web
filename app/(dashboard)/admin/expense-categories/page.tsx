import { MOCK_EXPENSE_CATEGORIES } from "@/lib/mock-data/expense-categories";
import { CHART_OF_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { ExpenseCategoriesTable } from "@/features/admin/expense-categories/categories-table";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/settings";

export default function ExpenseCategoriesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Receipt}
        title="Expense Categories"
        description="Branch and head-office expense classifications and the ledger account each one posts to."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Expense Categories" }]}
      />
      <ExpenseCategoriesTable categories={MOCK_EXPENSE_CATEGORIES} accounts={CHART_OF_ACCOUNTS} />
    </div>
  );
}
