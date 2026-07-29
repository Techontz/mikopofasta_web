import { getCustomerCategories } from "@/lib/api/customers";
import { CategoriesTable } from "@/features/admin/customer-categories/categories-table";
import { Tags } from "lucide-react";
import { PageHeader } from "@/components/settings";

export default async function CustomerCategoriesPage() {
  const categories = await getCustomerCategories();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Tags}
        title="Main Loan Category"
        description="The KYC rule engine — risk tier, required documents, and the dynamic fields each category collects."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Loan category" }]}
      />
      <CategoriesTable categories={categories} />
    </div>
  );
}
