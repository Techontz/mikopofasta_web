import { MOCK_AUDIT_LOGS } from "@/lib/mock-data/audit-logs";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { AuditLogsTable } from "@/features/admin/audit-logs/audit-logs-table";

export default function AuditLogsPage() {
  const logs = [...MOCK_AUDIT_LOGS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return <AuditLogsTable logs={logs} users={MOCK_USERS} />;
}
