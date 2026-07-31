import { Ban } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { reportNavFor } from "@/features/ledger/nav-items";
import { DefaultLoanPanel } from "@/features/legacy-reports/loan-report-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.REPORTS_VIEW)) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Ban}
        title="Default Loan"
        description="Loans past their end date with money still outstanding."
        breadcrumb={[{ label: "Report", href: "/reports" }, { label: "Default Loan" }]}
      />
      <SectionNav items={reportNavFor(user)} />
      <DefaultLoanPanel />
    </>
  );
}
