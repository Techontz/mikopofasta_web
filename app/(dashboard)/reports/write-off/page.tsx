import { CircleX } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { reportNavFor } from "@/features/ledger/nav-items";
import { WriteOffPanel } from "@/features/legacy-reports/empty-report-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.REPORTS_VIEW)) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={CircleX}
        title="Write-off Loan"
        description="Loans the business has given up on, and what came back anyway."
        breadcrumb={[{ label: "Report", href: "/reports" }, { label: "Write-off" }]}
      />
      <SectionNav items={reportNavFor(user)} />
      <WriteOffPanel />
    </>
  );
}
