import { MOCK_EXPENSE_CATEGORIES } from "@/lib/mock-data/expense-categories";
import { CHART_OF_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { ExpenseCategoriesTable } from "@/features/admin/expense-categories/categories-table";

export default function ExpenseCategoriesPage() {
  return <ExpenseCategoriesTable categories={MOCK_EXPENSE_CATEGORIES} accounts={CHART_OF_ACCOUNTS} />;
}
