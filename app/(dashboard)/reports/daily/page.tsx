import { CalendarDays } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { reportNavFor } from "@/features/ledger/nav-items";
import { DailyReportPanel } from "@/features/legacy-reports/summary-report-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.REPORTS_VIEW)) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={CalendarDays}
        title="Daily Report"
        description="Everything that moved today, in and out, and what the business closes on."
        breadcrumb={[{ label: "Report", href: "/reports" }, { label: "Daily Report" }]}
      />
      <SectionNav items={reportNavFor(user)} />
      <DailyReportPanel />
    </>
  );
}
