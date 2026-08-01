import { ArrowUpRight } from "lucide-react";
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
        icon={ArrowUpRight}
        title="Today Received"
        description="What has actually come in, and which officer brought it."
        breadcrumb={[{ label: "Report", href: "/reports" }, { label: "Received" }]}
      />
      <SectionNav items={reportNavFor(user)} />
      <LiveReportPanel
        slug="daily-collection"
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
        note="What has been collected, by day. The legacy screen showed today alone; set the window to today for exactly that."
      />
    </>
  );
}
