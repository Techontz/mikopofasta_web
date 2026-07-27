"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";

export interface BranchOption {
  id: string;
  name: string;
}

/**
 * Filters map 1:1 onto the `?branch_id=&period=&from=&to=` query contract in
 * backend §15.6 — they live in the URL so a filtered report is shareable and
 * survives a refresh.
 */
export function ReportFiltersBar({
  supported,
  branches,
}: {
  supported: ("branchId" | "period" | "from" | "to")[];
  branches: BranchOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = {
    branchId: searchParams.get("branch_id") ?? "",
    period: searchParams.get("period") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
  };

  const [draft, setDraft] = React.useState(current);
  const hasAny = Object.values(current).some(Boolean);

  function apply(next: typeof draft) {
    const params = new URLSearchParams();
    if (next.branchId) params.set("branch_id", next.branchId);
    if (next.period) params.set("period", next.period);
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  if (supported.length === 0) {
    return <p className="text-sm text-muted-foreground">This report has no filters — it always covers the whole book.</p>;
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {supported.includes("branchId") && (
        <div className="space-y-1.5">
          <Label>Branch</Label>
          <Select
            value={draft.branchId || ALL}
            onValueChange={(v) => {
              const next = { ...draft, branchId: v === ALL ? "" : (v ?? "") };
              setDraft(next);
              apply(next);
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue>{(v: string) => branches.find((b) => b.id === v)?.name ?? "All branches"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {supported.includes("period") && (
        <div className="space-y-1.5">
          <Label htmlFor="rf-period">Period</Label>
          <Input
            id="rf-period"
            placeholder="YYYY-MM"
            className="w-32"
            value={draft.period}
            onChange={(e) => setDraft({ ...draft, period: e.target.value })}
            onBlur={() => apply(draft)}
          />
        </div>
      )}

      {supported.includes("from") && (
        <div className="space-y-1.5">
          <Label htmlFor="rf-from">From</Label>
          <Input id="rf-from" type="date" className="w-40" value={draft.from} onChange={(e) => apply({ ...draft, from: e.target.value })} />
        </div>
      )}

      {supported.includes("to") && (
        <div className="space-y-1.5">
          <Label htmlFor="rf-to">To</Label>
          <Input id="rf-to" type="date" className="w-40" value={draft.to} onChange={(e) => apply({ ...draft, to: e.target.value })} />
        </div>
      )}

      {hasAny && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const cleared = { branchId: "", period: "", from: "", to: "" };
            setDraft(cleared);
            apply(cleared);
          }}
        >
          <FilterX className="size-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
