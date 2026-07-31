import { Layers } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { salaryAdvanceNavFor } from "@/features/ledger/nav-items";
import { getSalaryAdvanceCategories } from "@/lib/api/salary-advance";
import { CategoriesPanel } from "@/features/salary-advance/categories-panel";

export default async function SalaryAdvanceCategoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE])) return <AccessDeniedState />;

  const categories = await getSalaryAdvanceCategories();

  return (
    <>
      <PageHeader
        icon={Layers}
        title="Salary Advance Category"
        description="The bands a salary advance is priced against — interest, the amount range each covers, and the charge fee."
        breadcrumb={[{ label: "Salary Advance", href: "/salary-advance/categories" }, { label: "Salary Advance Category" }]}
      />
      <SectionNav items={salaryAdvanceNavFor(user)} />
      <CategoriesPanel categories={categories} />
    </>
  );
}
