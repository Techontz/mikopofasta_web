"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Check,
  Download,
  Loader2,
  Maximize2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  UserRoundCog,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FaceScanDialog } from "@/features/customers/profile/face-scan-dialog";
import {
  FACE_CHECK_LABELS,
  FACE_CHECK_NAMES,
} from "@/features/customers/registration-wizard/face-scanner/face-report";
import { getFaceScanAuditReport } from "@/features/customers/actions";
import type { FaceScan } from "@/types/face-scan";

/**
 * Face Verification — the biometric section of the customer profile.
 *
 * The profile used to show a photograph and the word "verified". That is the
 * conclusion with none of the evidence: it could not say when the scan was
 * taken, by whom, on what camera, how good the image was, or whether the
 * customer had actually completed a liveness sequence. A KYC control that
 * cannot be inspected is a control nobody can rely on.
 *
 * So this reads the whole record. The active scan first, then every scan it
 * superseded, because a re-scan is only meaningful next to what it replaced.
 */

/** Human dates, in the branch's own reading order. */
const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function FaceVerificationPanel({
  customerId,
  customerNumber,
  scans,
  canManage,
}: {
  customerId: string;
  customerNumber: string;
  scans: FaceScan[];
  canManage: boolean;
}) {
  const [dialog, setDialog] = React.useState<"rescan" | "replace" | null>(null);
  const [viewing, setViewing] = React.useState<FaceScan | null>(null);
  const [downloading, setDownloading] = React.useState<string | null>(null);

  const active = scans.find((s) => s.isActive) ?? scans[0] ?? null;
  const history = scans.filter((s) => s.id !== active?.id);

  /**
   * "Download Audit" — the scan's full record as a JSON file.
   *
   * Built in the browser from what the server returns rather than served as a
   * file: it keeps the bearer token where it belongs, and there is no URL that
   * could be shared to reach somebody's biometric metadata.
   */
  async function downloadAudit(scan: FaceScan) {
    setDownloading(scan.id);
    const result = await getFaceScanAuditReport(customerId, scan.id);
    setDownloading(null);

    if (!result.ok || !result.report) {
      toast.error(result.message ?? "The audit report could not be produced.");
      return;
    }

    const blob = new Blob([JSON.stringify(result.report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `face-scan-audit-${customerNumber}-${scan.id}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Audit report downloaded.");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Face Verification</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              The liveness check on file, and every scan it replaced.
            </p>
          </div>

          {canManage && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setDialog("rescan")}>
                <RefreshCw className="size-3.5" />
                Re-scan Face
              </Button>
              {active && (
                <Button type="button" size="sm" variant="outline" onClick={() => setDialog("replace")}>
                  <UserRoundCog className="size-3.5" />
                  Replace Face
                </Button>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {active === null ? (
            <div className="flex items-start gap-3 rounded-lg border border-dashed p-5">
              <ShieldOff className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
              <div className="space-y-1">
                <p className="text-sm font-medium">Not verified</p>
                <p className="max-w-md text-xs text-muted-foreground">
                  {/* Stated plainly rather than dressed as an error. A customer
                      registered before the scanner existed has no scan, and
                      that is a fact about the record, not a fault. */}
                  No face scan has been recorded for this customer.
                  {canManage && " Use Re-scan Face to capture one."}
                </p>
              </div>
            </div>
          ) : (
            <ActiveScan
              scan={active}
              onView={() => setViewing(active)}
              onDownload={() => downloadAudit(active)}
              downloading={downloading === active.id}
            />
          )}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Scan history ({history.length})</CardTitle>
            <p className="text-xs text-muted-foreground">
              Superseded scans. Nothing is deleted — the image a re-scan replaced is the only thing
              the new one can be checked against.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((scan) => (
              <HistoryRow
                key={scan.id}
                scan={scan}
                onView={() => setViewing(scan)}
                onDownload={() => downloadAudit(scan)}
                downloading={downloading === scan.id}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------- full image viewer */}
      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Face capture</DialogTitle>
            <DialogDescription>
              {viewing && `${when(viewing.scannedAt)} · quality ${viewing.qualityScore}%`}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            /* eslint-disable-next-line @next/next/no-img-element -- a signed,
               expiring URL to the private KYC disk; the optimiser would cache it. */
            <img
              src={viewing.imageUrl}
              alt="Face capture"
              className="max-h-[70vh] w-full rounded-md border object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {dialog && (
        <FaceScanDialog
          customerId={customerId}
          mode={dialog}
          open
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}
    </div>
  );
}

/* ----------------------------------------------------------- active scan */

function ActiveScan({
  scan,
  onView,
  onDownload,
  downloading,
}: {
  scan: FaceScan;
  onView: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const passed = scan.status === "passed";

  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
      {/* --------------------------------------------- the image and verdict */}
      <div className="space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed, expiring URL */}
        <img
          src={scan.imageUrl}
          alt="Current face capture"
          className="aspect-[3/4] w-full rounded-lg border object-cover"
        />

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onView}>
            <Maximize2 className="size-3.5" />
            View Full Image
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDownload} disabled={downloading}>
            {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Download Audit
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------ the evidence */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={
              passed
                ? "flex items-center gap-1.5 text-sm font-semibold text-emerald-600"
                : "flex items-center gap-1.5 text-sm font-semibold text-amber-600"
            }
          >
            {passed ? <ShieldCheck className="size-4" aria-hidden /> : <ShieldAlert className="size-4" aria-hidden />}
            {passed ? "Verified" : "Not Verified"}
          </span>

          <Score label="Quality Score" value={scan.qualityScore} />
        </div>

        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Verification Date" value={when(scan.scannedAt)} />
          <Fact label="Operator" value={scan.scannedByName ?? "—"} />
          <Fact label="Scanner Version" value={scan.scannerVersion} />
          <Fact label="Capture Device" value={scan.captureDevice ?? "Not reported"} />
          <Fact
            label="Capture Resolution"
            value={scan.captureResolution ?? "Not reported"}
          />
          <Fact
            label="Scan Duration"
            value={scan.captureDurationMs === null ? "Not reported" : `${(scan.captureDurationMs / 1000).toFixed(1)} s`}
          />
          <Fact
            label="Liveness Result"
            value={scan.livenessPassed ? "Passed" : "Failed"}
            tone={scan.livenessPassed ? "good" : "bad"}
          />
          <Fact
            label="Pose Result"
            value={scan.poseSequenceCompleted ? "All five completed" : "Incomplete"}
            tone={scan.poseSequenceCompleted ? "good" : "bad"}
          />
          <Fact label="Recorded From" value={scan.ipAddress ?? "—"} />
          {scan.reason && <Fact label="Reason" value={scan.reason} className="sm:col-span-2" />}
        </dl>

        {/* The graded measurements. Bars rather than a table: the question an
            officer asks of these is "is anything low", which is a shape. */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Measured quality</p>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <Meter label="Lighting" value={scan.brightnessScore} />
            <Meter label="Sharpness" value={scan.blurScore} />
            <Meter label="Distance" value={scan.distanceScore} />
            <Meter label="Centring" value={scan.centeringScore} />
            <Meter label="Eyes open" value={scan.eyesOpenScore} />
          </div>
        </div>

        {/* Every check, including the ones that failed. A checklist that only
            shows passes is a decoration. */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Verification checks</p>
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {FACE_CHECK_NAMES.map((name) => (
              <CheckRow key={name} label={FACE_CHECK_LABELS[name]} ok={scan.checks[name]} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- history */

function HistoryRow({
  scan,
  onView,
  onDownload,
  downloading,
}: {
  scan: FaceScan;
  onView: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed, expiring URL */}
      <img src={scan.imageUrl} alt="" className="size-12 rounded-md border object-cover" />

      <div className="min-w-40 flex-1">
        <p className="text-sm font-medium">{when(scan.scannedAt)}</p>
        <p className="text-xs text-muted-foreground">
          {scan.scannedByName ?? "Unknown operator"} · {scan.scannerVersion}
        </p>
      </div>

      <Badge variant={scan.status === "passed" ? "secondary" : "destructive"}>
        {scan.status === "passed" ? "Passed" : "Failed"}
      </Badge>
      <span className="text-xs text-muted-foreground">Quality {scan.qualityScore}%</span>

      {scan.reason && (
        <p className="w-full text-xs text-muted-foreground sm:w-auto sm:max-w-xs sm:truncate" title={scan.reason}>
          {scan.reason}
        </p>
      )}

      <div className="flex gap-1">
        <Button type="button" size="sm" variant="ghost" onClick={onView}>
          <Maximize2 className="size-3.5" />
          View
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDownload} disabled={downloading}>
          {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          Audit
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- parts */

function Fact({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          tone === "good"
            ? "text-sm font-medium text-emerald-600"
            : tone === "bad"
              ? "text-sm font-medium text-amber-600"
              : "text-sm font-medium"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}%</span>
    </span>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${value}%`,
            /* Amber below the point where an image starts being hard to
               identify somebody from, rather than a single colour that says
               the same thing about 20% and 95%. */
            background: value >= 70 ? "rgb(16 185 129)" : value >= 40 ? "rgb(245 158 11)" : "rgb(239 68 68)",
          }}
        />
      </span>
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{value}%</span>
    </div>
  );
}

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-1.5 text-xs">
      {ok ? (
        <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <X className="size-3.5 shrink-0 text-destructive" aria-hidden />
      )}
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
      <span className="sr-only">{ok ? "passed" : "failed"}</span>
    </li>
  );
}
