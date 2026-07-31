import { Receipt } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getLoanFees } from "@/lib/api/loan-charges";
import { PageHeader } from "@/components/settings";
import { LoanFeesTable } from "@/features/admin/loan-fees/loan-fees-table";

export default async function LoanFeesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS)) return <AccessDeniedState />;

  const rows = await getLoanFees();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Receipt}
        title="Loan Fee"
        description="The arrangement fee and insurance premium charged on each loan category."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Loan Fee Setup" }]}
      />
      <LoanFeesTable rows={rows} />
    </div>
  );
}
