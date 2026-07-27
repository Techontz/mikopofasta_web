"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Inbox, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatMoney } from "@/lib/domain/money";
import { allocateSuspenseItem, markSuspenseInvestigating } from "@/features/repayments/actions";

const NONE = "__none__";

export interface SuspenseRow {
  id: string;
  reason: string;
  amount: number;
  status: string;
  paymentReference: string;
  resolvedByName: string | null;
}

export interface LoanOption {
  id: string;
  label: string;
}

export function SuspensePanel({ items, loans }: { items: SuspenseRow[]; loans: LoanOption[] }) {
  if (items.length === 0) {
    return <EmptyState icon={Inbox} title="Suspense is clear" description="Every payment received has been matched to a loan." />;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <SuspenseCard key={item.id} item={item} loans={loans} />
      ))}
    </ul>
  );
}

function SuspenseCard({ item, loans }: { item: SuspenseRow; loans: LoanOption[] }) {
  const [loanId, setLoanId] = React.useState("");
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  const resolved = item.status === "allocated";

  return (
    <li className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{item.reason}</p>
          <p className="text-xs text-muted-foreground">
            {item.paymentReference}
            {item.resolvedByName && ` · ${item.resolvedByName}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-tabular text-sm font-semibold">{formatMoney(item.amount)}</span>
          <Badge variant={resolved ? "default" : item.status === "investigating" ? "secondary" : "outline"} className="capitalize">
            {item.status}
          </Badge>
        </div>
      </div>

      {!resolved && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-56 flex-1 space-y-1.5">
            <Select value={loanId || NONE} onValueChange={(v) => setLoanId(v === NONE ? "" : (v ?? ""))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Allocate to loan…">
                  {(v: string) => loans.find((l) => l.id === v)?.label ?? "Allocate to loan…"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} className="text-muted-foreground">
                  Allocate to loan…
                </SelectItem>
                {loans.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" disabled={pending || !loanId} onClick={() => run(() => allocateSuspenseItem(item.id, loanId))}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Allocate
          </Button>
          {item.status !== "investigating" && (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => markSuspenseInvestigating(item.id))}>
              <Search className="size-4" />
              Investigate
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
