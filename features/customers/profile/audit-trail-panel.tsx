import { History } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import type { AuditLogRecord } from "@/lib/api/system-configuration";

/**
 * One record's own history — the panel on a customer profile and a loan detail.
 *
 * The actor's name comes down resolved beside the row, so there is no id-to-name
 * map to pass and nothing to look up. "System" for an anonymous event.
 */
export function AuditTrailPanel({ logs }: { logs: AuditLogRecord[] }) {
  const sorted = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (sorted.length === 0) {
    return <EmptyState icon={History} title="No audit events recorded yet" />;
  }

  return (
    <ul className="space-y-2">
      {sorted.map((log) => (
        <li key={log.id} className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">{log.action.replace(/_/g, " ")}</p>
            <p className="text-xs text-muted-foreground">{log.userName ?? "System"}</p>
          </div>
          <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
        </li>
      ))}
    </ul>
  );
}
