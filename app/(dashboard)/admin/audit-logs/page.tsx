import { History } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getAuditLogs } from "@/lib/api/system-configuration";
import { AuditLogsTable } from "@/features/admin/audit-logs/audit-logs-table";
import { PageHeader } from "@/components/settings";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; search?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  /*
   * The one Settings screen with a gate on the read.
   *
   * The trail records who did what across every module — salary figures,
   * identity changes, every approval — so it reveals more than any single
   * screen it summarises. `audit.view` exists to be granted to an auditor
   * without granting the ability to change anything, and the API enforces the
   * same pair; this check is only so the refusal renders as a page rather than
   * as an error.
   */
  const allowed =
    hasPermission(user, PERMISSIONS.AUDIT_VIEW) || hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS);
  if (!allowed) return <AccessDeniedState />;

  const params = await searchParams;
  const { logs, actions, pagination } = await getAuditLogs({
    page: params.page ? Number(params.page) : undefined,
    action: params.action,
    search: params.search,
    // The trail is long by design; a page of 100 is the API's ceiling.
    perPage: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={History}
        title="Audit Logs"
        description="The full system audit trail — who did what, to which record, and when."
        breadcrumb={[{ label: "Administration", href: "/admin" }, { label: "Audit Logs" }]}
      />
      <AuditLogsTable logs={logs} actions={actions} total={pagination?.total ?? logs.length} />
    </div>
  );
}
