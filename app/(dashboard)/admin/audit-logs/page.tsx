import { MOCK_AUDIT_LOGS } from "@/lib/mock-data/audit-logs";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { AuditLogsTable } from "@/features/admin/audit-logs/audit-logs-table";
import { History } from "lucide-react";
import { PageHeader } from "@/components/settings";

export default function AuditLogsPage() {
  const logs = [...MOCK_AUDIT_LOGS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return (
    <div className="space-y-6">
      <PageHeader
        icon={History}
        title="Audit Logs"
        description="The full system audit trail — who did what, to which record, and when."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Audit Logs" }]}
      />
      <AuditLogsTable logs={logs} users={MOCK_USERS} />
    </div>
  );
}
