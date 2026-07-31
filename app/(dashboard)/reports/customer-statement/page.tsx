import { FileSearch } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { reportNavFor } from "@/features/ledger/nav-items";
import { CustomerStatementPanel } from "@/features/legacy-reports/summary-report-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.REPORTS_VIEW)) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={FileSearch}
        title="Customer statement"
        description="Pick a customer and a loan to open their statement."
        breadcrumb={[{ label: "Report", href: "/reports" }, { label: "Customer statement" }]}
      />
      <SectionNav items={reportNavFor(user)} />
      <CustomerStatementPanel />
    </>
  );
}
