"use client";

import Link from "next/link";

import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { useApi } from "@/lib/hooks";

interface PendingGroup {
  workflow: string;
  label: string;
  count: number;
  amount: number;
  rows: Array<{ link?: string | null; status?: string | null }>;
}

/**
 * Pending Approvals / Applications (enhancement §11.2–11.3) for dashboards that had none (HR, Admin): live from
 * GET approvals/pending, which lists only the workflows the signed-in role may decide, in its branch scope. The only
 * dashboard part that opens records; a red outline marks every workflow with something waiting.
 */
export function PendingApprovalsPanel({ className = "" }: { className?: string }) {
  const { can } = useAuth();
  const { data, isLoading } = useApi<{ groups: PendingGroup[]; total_count: number }>(can("approvals.view") ? "approvals/pending" : null);

  if (!can("approvals.view")) {
    return null;
  }

  const groups = (data?.groups ?? []).filter((group) => group.count > 0);

  return (
    <div className={`card mf-pending-panel ${className}`}>
      <div className="header d-flex justify-content-between align-items-center">
        <h2>Pending Approvals / Applications</h2>
        <Link href="/approvals" className="btn btn-sm btn-link">View All</Link>
      </div>
      <div className="body">
        {isLoading ? (
          <Loading inline />
        ) : groups.length === 0 ? (
          <p className="mb-0 text-muted">Nothing is waiting for approval.</p>
        ) : (
          <ul className="list-unstyled mb-0">
            {groups.map((group) => (
              <li key={group.workflow} className="d-flex align-items-center py-2 border-bottom">
                <b className="mf-pending-alert mr-3">{group.count}</b>
                <span className="flex-grow-1 text-uppercase">{group.label}{group.amount > 0 && <small className="d-block text-muted text-none">TZS {money(group.amount)}</small>}</span>
                <span className="badge badge-warning mr-2">{group.rows[0]?.status ?? "Pending"}</span>
                <Link href={group.rows[0]?.link || "/approvals"} className="btn btn-sm btn-outline-danger">Open</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
