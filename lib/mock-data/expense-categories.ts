import type { ExpenseCategory } from "@/types/expense";
import { EXPENSE_CHART_ACCOUNT_IDS } from "@/lib/mock-data/chart-of-accounts";

export const MOCK_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: "exp-cat-rent", name: "Rent", scope: "branch", chartAccountId: EXPENSE_CHART_ACCOUNT_IDS.RENT, createdBy: "u-admin", deletedAt: null },
  { id: "exp-cat-electricity", name: "Electricity", scope: "branch", chartAccountId: EXPENSE_CHART_ACCOUNT_IDS.ELECTRICITY, createdBy: "u-admin", deletedAt: null },
  { id: "exp-cat-transport", name: "Transport", scope: "branch", chartAccountId: EXPENSE_CHART_ACCOUNT_IDS.TRANSPORT, createdBy: "u-admin", deletedAt: null },
  { id: "exp-cat-airtime", name: "Airtime", scope: "branch", chartAccountId: EXPENSE_CHART_ACCOUNT_IDS.AIRTIME, createdBy: "u-admin", deletedAt: null },
  { id: "exp-cat-office-supplies", name: "Office Supplies", scope: "hq", chartAccountId: EXPENSE_CHART_ACCOUNT_IDS.OFFICE_SUPPLIES, createdBy: "u-admin", deletedAt: null },
];
