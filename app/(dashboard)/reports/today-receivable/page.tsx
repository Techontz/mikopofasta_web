import { ArrowDownLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { reportNavFor } from "@/features/ledger/nav-items";
import { LiveReportPanel } from "@/features/reports/live-report-panel";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.REPORTS_VIEW)) return <AccessDeniedState />;

  const query = await searchParams;
  const single = (key: string) => {
    const value = query[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  };

  return (
    <>
      <PageHeader
        icon={ArrowDownLeft}
        title="Today Receivable"
        description="What is due in, for the period selected."
        breadcrumb={[{ label: "Report", href: "/reports" }, { label: "Receivable" }]}
      />
      <SectionNav items={reportNavFor(user)} />
      <LiveReportPanel
        slug="arrears"
        searchParams={{
          branch_id: single("branch_id"),
          period: single("period"),
          from: single("from"),
          to: single("to"),
          search: single("search"),
          sort: single("sort"),
          direction: single("direction"),
          page: single("page"),
          per_page: single("per_page"),
        }}
        note="Everything currently receivable, oldest arrears first. The legacy screen showed only today's slice; the window is a filter here, so today is one setting rather than a separate report."
      />
    </>
  );
}
