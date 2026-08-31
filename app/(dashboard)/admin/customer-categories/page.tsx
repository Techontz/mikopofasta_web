import { getCustomerCategories } from "@/lib/api/customers";
import { getMasterData } from "@/lib/api/master-data";
import { CategoriesTable } from "@/features/admin/customer-categories/categories-table";
import { Tags } from "lucide-react";
import { PageHeader } from "@/components/settings";
import { getCurrentUser } from "@/lib/auth/session";

export default async function CustomerCategoriesPage() {
  const [categories, user, documentTypes] = await Promise.all([
    getCustomerCategories(),
    getCurrentUser(),
    /* Offered as required or optional documents by the registration-form
       dialog. Fails soft: an unavailable list should leave one picker empty
       and explaining itself, not take the screen down. */
    getMasterData("document-types").catch(() => []),
  ]);

  /* The classification system is the Super Admin's. An Admin reaches this
     screen — /admin is gated on admin.org_settings — and may read it, but the
     controls that change it are not theirs. CustomerCategoryPolicy refuses the
     request regardless; this keeps the screen honest about it. */
  const canManage = user?.role === "super_admin";

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Tags}
        title="Customer Types"
        description="The broad customer classifications your institution serves. Administrator-managed, and each one can decide what registration asks of the customers filed under it."
        breadcrumb={[{ label: "Administration", href: "/admin" }, { label: "Customer Types" }]}
      />
      <CategoriesTable categories={categories} documentTypes={documentTypes} canManage={canManage} />
    </div>
  );
}
