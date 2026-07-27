"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { ReasonDialog } from "@/features/customers/profile/reason-dialog";
import { formatMoney } from "@/lib/domain/money";
import { approveReversal, rejectReversal } from "@/features/ledger/actions";

export interface ReversalRow {
  id: string;
  entryId: string;
  entryNumber: string;
  entryDescription: string;
  amount: number;
  reason: string;
  requestedByName: string;
  requestedById: string;
  decidedByName: string | null;
  status: string;
}

const STATUS_TONE: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function ReversalsPanel({
  requests,
  canApprove,
  currentUserId,
}: {
  requests: ReversalRow[];
  canApprove: boolean;
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();

  if (requests.length === 0) {
    return <EmptyState icon={ShieldCheck} title="No reversal requests" description="Requests appear here for a second pair of eyes to approve." />;
  }

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <ul className="space-y-3">
      {requests.map((r) => {
        const isOwn = r.requestedById === currentUserId;
        return (
          <li key={r.id} className="space-y-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  <Link href={`/ledger/entries/${r.entryId}`} className="font-tabular hover:underline">
                    {r.entryNumber}
                  </Link>{" "}
                  · {formatMoney(r.amount)}
                </p>
                <p className="truncate text-xs text-muted-foreground">{r.entryDescription}</p>
                <p className="mt-1 text-sm">&ldquo;{r.reason}&rdquo;</p>
                <p className="text-xs text-muted-foreground">
                  Requested by {r.requestedByName}
                  {r.decidedByName && ` · decided by ${r.decidedByName}`}
                </p>
              </div>
              <Badge variant="outline" className={`capitalize ${STATUS_TONE[r.status] ?? ""}`}>
                {r.status}
              </Badge>
            </div>

            {r.status === "pending" && canApprove && (
              <div className="flex flex-wrap gap-2">
                {isOwn ? (
                  <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                    You requested this reversal, so you can&apos;t approve it — reversal requires a different approver.
                  </p>
                ) : (
                  <>
                    <Button size="sm" disabled={pending} onClick={() => run(() => approveReversal(r.id))}>
                      {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      Approve &amp; Post Reversal
                    </Button>
                    <ReasonDialog
                      trigger={
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                          <XCircle className="size-4" />
                          Reject
                        </Button>
                      }
                      title="Reject this reversal request?"
                      description="The original entry stays as posted and no reversal is created."
                      confirmLabel="Reject Request"
                      destructive
                      onConfirm={(reason) => rejectReversal(r.id, reason)}
                    />
                  </>
                )}
              </div>
            )}

            {r.status === "pending" && !canApprove && (
              <p className="text-sm text-muted-foreground">Awaiting Finance approval — you don&apos;t hold the reversal-approval permission.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
