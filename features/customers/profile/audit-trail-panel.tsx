import { History } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import type { AuditLog } from "@/types/audit";

export function AuditTrailPanel({ logs, actorNames }: { logs: AuditLog[]; actorNames: Record<string, string> }) {
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
            <p className="text-xs text-muted-foreground">{log.userId ? (actorNames[log.userId] ?? log.userId) : "System"}</p>
          </div>
          <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
        </li>
      ))}
    </ul>
  );
}
