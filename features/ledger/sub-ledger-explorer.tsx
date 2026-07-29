"use client";

import * as React from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatMoney } from "@/lib/domain/money";
import { fetchSubLedger, type SubLedgerLines } from "@/features/ledger/actions";

export type SubLedgerDimension = "customer" | "loan" | "staff" | "branch";

export interface SubLedgerOption {
  id: string;
  label: string;
}

/** The API's dimension slugs, which differ from the singular labels shown here. */
const DIMENSION_SLUGS = {
  customer: "customers",
  loan: "loans",
  staff: "staff",
  branch: "branches",
} as const;

const DIMENSION_LABELS: Record<SubLedgerDimension, string> = {
  customer: "Customer",
  loan: "Loan",
  staff: "Staff",
  branch: "Branch",
};

/**
 * Customer / Loan / Staff / Branch "ledgers" are not separate tables — they
 * are journal_entry_lines filtered by the matching dimension id (backend
 * §2.7). This one screen therefore covers all four §15.4 sub-ledger
 * endpoints rather than duplicating a page per dimension.
 */
export function SubLedgerExplorer({ options }: { options: Record<SubLedgerDimension, SubLedgerOption[]> }) {
  const [dimension, setDimension] = React.useState<SubLedgerDimension>("loan");
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [result, setResult] = React.useState<SubLedgerLines | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const currentOptions = options[dimension];

  /*
   * One subject at a time. `GET /ledger/{dimension}/{id}` answers per subject,
   * so the lines are fetched when a selection is made rather than the page
   * shipping the entire journal to the browser to filter locally.
   */
  React.useEffect(() => {
    let cancelled = false;

    // Every state change is deferred out of the effect body — a synchronous
    // setState here cascades a second render on each selection.
    const run = async () => {
      if (!selectedId) {
        setResult(null);
        setError(null);
        return;
      }

      setLoading(true);
      const response = await fetchSubLedger(DIMENSION_SLUGS[dimension], selectedId);
      if (cancelled) return;

      if (response.ok && response.data) {
        setResult(response.data);
        setError(null);
      } else {
        setResult(null);
        setError(response.message ?? "Could not load this sub-ledger.");
      }
      setLoading(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [dimension, selectedId]);

  const filtered = result?.lines ?? [];
  const debits = result?.totalDebits ?? 0;
  const credits = result?.totalCredits ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Choose a Sub-Ledger</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Dimension</Label>
            <Select
              value={dimension}
              onValueChange={(v) => {
                if (!v) return;
                setDimension(v as SubLedgerDimension);
                setSelectedId("");
              }}
            >
              <SelectTrigger aria-label="Dimension" className="w-full">
                <SelectValue>{(v: string) => DIMENSION_LABELS[v as SubLedgerDimension]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DIMENSION_LABELS) as SubLedgerDimension[]).map((d) => (
                  <SelectItem key={d} value={d}>
                    {DIMENSION_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{DIMENSION_LABELS[dimension]}</Label>
            <Select value={selectedId || "__none__"} onValueChange={(v) => setSelectedId(v === "__none__" ? "" : (v ?? ""))}>
              <SelectTrigger aria-label={`${DIMENSION_LABELS[dimension]}`} className="w-full">
                <SelectValue placeholder={`Select a ${DIMENSION_LABELS[dimension].toLowerCase()}`}>
                  {(v: string) => currentOptions.find((o) => o.id === v)?.label ?? `Select a ${DIMENSION_LABELS[dimension].toLowerCase()}`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground">
                  Select a {DIMENSION_LABELS[dimension].toLowerCase()}
                </SelectItem>
                {currentOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedId && !loading ? `Ledger Lines (${filtered.length})` : "Ledger Lines"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedId ? (
            <EmptyState icon={Layers} title="Pick a dimension and subject" description="Sub-ledgers are journal lines filtered by customer, loan, staff, or branch." />
          ) : loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground" role="status">
              Loading ledger lines…
            </p>
          ) : error ? (
            <p className="py-6 text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Layers} title="No postings" description="Nothing has been posted against this subject yet." />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Fact label="Debits" value={formatMoney(debits)} />
                <Fact label="Credits" value={formatMoney(credits)} />
                <Fact label="Net" value={formatMoney(result?.net ?? debits - credits)} />
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-nowrap">
                          <Link href={`/ledger/entries/${l.entryId}`} className="font-tabular hover:underline">
                            View entry
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="font-tabular">{l.accountCode ?? "—"}</span> {l.accountName ?? ""}
                        </TableCell>
                        <TableCell className="font-tabular text-right">{l.debit > 0 ? formatMoney(l.debit) : "—"}</TableCell>
                        <TableCell className="font-tabular text-right">{l.credit > 0 ? formatMoney(l.credit) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-tabular text-sm font-semibold">{value}</p>
    </div>
  );
}
