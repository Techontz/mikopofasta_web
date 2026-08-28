"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Loader2, MapPinned, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsCard } from "@/components/settings";
import { importGeography } from "@/features/admin/geography/geography-actions";
import type { GeographyImportResult, GeographyStatus } from "@/lib/api/geography";

/**
 * Load the administrative register from a CSV.
 *
 * WHY THIS SCREEN EXISTS. Registration requires all four address levels to be
 * chosen from reference data. The application ships a demonstration subset —
 * and deliberately contains no Tanzanian place names of its own — so a branch
 * outside those wards cannot record an address until the real register is
 * loaded. Typing the ward instead is what produced four spellings of one place
 * and an address nothing could search.
 *
 * SAFE TO RUN AGAIN, and that is the property worth surfacing. The result
 * separates created from already-present, so a second run reads "0 created,
 * 4,000 already on file" rather than leaving the administrator wondering
 * whether they have just duplicated the country.
 *
 * REJECTED ROWS ARE SHOWN, NOT COUNTED. A row that names a ward with no
 * district is refused, and the file's other rows still load. Naming the row
 * number and the reason is what lets somebody fix the source and re-import —
 * which is safe, because the rows that already landed are skipped.
 */
export function GeographyImportPanel({ status }: { status: GeographyStatus }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<GeographyImportResult | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function submit() {
    if (!file) return;

    setPending(true);
    setResult(null);

    const form = new FormData();
    form.append("file", file);

    const outcome = await importGeography(form);

    setPending(false);

    if (!outcome.ok) {
      toast.error(outcome.message ?? "The import failed.");

      return;
    }

    setResult(outcome.result ?? null);
    setFile(null);
    /* A file input's value cannot be cleared by re-rendering. */
    if (inputRef.current) inputRef.current.value = "";

    const created = Object.values(outcome.result?.created ?? {}).reduce((a, b) => a + b, 0);
    toast.success(created === 0 ? "Nothing new — everything in the file was already on file." : `${created} records added.`);
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        title="What is on file"
        description="Registration can only offer an address these tables already contain."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Count label="Regions" value={status.regions} />
          <Count label="Districts" value={status.districts} />
          <Count label="Wards" value={status.wards} />
          <Count label="Streets" value={status.streets} />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Import a register"
        description="A CSV with one row per place. Running the same file twice adds nothing."
      >
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium">Expected columns</p>
            <pre className="mt-1 overflow-x-auto text-xs">
              <code>{status.columns.join(",")}</code>
            </pre>
            <p className="mt-2 text-xs text-muted-foreground">
              A row may stop early — a region on its own is valid, so is a region and a district. A
              ward needs its district on the same row, and a street needs its ward; rows that break
              that are rejected and named below. Up to {status.maxRows.toLocaleString()} rows per
              file.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="geography-file">CSV file (max 20 MB)</Label>
              <Input
                ref={inputRef}
                id="geography-file"
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="button" onClick={submit} disabled={!file || pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-4" aria-hidden />
              )}
              Import
            </Button>
          </div>
        </div>
      </SettingsCard>

      {result && (
        <SettingsCard title="Result" description={`${result.rowsRead.toLocaleString()} rows read.`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["regions", "districts", "wards", "streets"] as const).map((level) => (
                <div key={level} className="rounded-lg border p-3">
                  <p className="text-xs capitalize text-muted-foreground">{level}</p>
                  <p className="text-sm font-medium">
                    <span className="text-emerald-700 dark:text-emerald-400">
                      +{result.created[level] ?? 0}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      / {result.existing[level] ?? 0} already on file
                    </span>
                  </p>
                </div>
              ))}
            </div>

            {result.rejectedCount === 0 ? (
              <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4" aria-hidden />
                Every row was accepted.
              </p>
            ) : (
              <div className="space-y-2 rounded-lg border border-destructive/30 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertTriangle className="size-4" aria-hidden />
                  {result.rejectedCount} row{result.rejectedCount === 1 ? "" : "s"} rejected
                </p>
                <p className="text-xs text-muted-foreground">
                  The rest of the file loaded. Correct these in the source and import it again —
                  the rows that already landed will be skipped.
                </p>
                <ul className="max-h-64 space-y-1 overflow-y-auto text-xs">
                  {result.rejected.map((r) => (
                    <li key={r.row} className="flex gap-2">
                      <span className="shrink-0 font-mono text-muted-foreground">line {r.row}</span>
                      <span>{r.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SettingsCard>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <MapPinned className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        This application ships no geographical data of its own. The register comes from the National
        Bureau of Statistics or TAMISEMI administrative list, exported to the columns above.
      </p>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
