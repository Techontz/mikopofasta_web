import { MOCK_CUSTOMER_CATEGORIES } from "@/lib/mock-data/customer-categories";
import { CategoriesTable } from "@/features/admin/customer-categories/categories-table";

export default function CustomerCategoriesPage() {
  return <CategoriesTable categories={MOCK_CUSTOMER_CATEGORIES} />;
}
