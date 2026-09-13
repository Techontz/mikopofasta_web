"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaceScanner } from "@/features/customers/registration-wizard/face-scanner/face-scanner";
import type { FaceScanReport } from "@/features/customers/registration-wizard/face-scanner/face-report";

/**
 * Step 4 — Face Verification. The last step, and deliberately after the save.
 *
 * THIS IS THE POINT OF THE WHOLE REDESIGN. The face capture used to sit in the
 * middle of the form, beside the bank card fields, and the wizard refused to
 * submit without it. A registration could therefore only be completed at a
 * desk with a working camera, in one sitting, with the customer still present
 * — and if any of those failed, everything typed was lost. There was no way to
 * take down someone's details and verify their face afterwards, which is how
 * the work actually happens in a branch.
 *
 * By the time this step is reached the customer EXISTS. Everything is saved,
 * their record is in the list, and their status reads "Awaiting face
 * verification" until the scan passes.
 *
 * COMPULSORY, AND WITH NO EXIT OF ITS OWN. The step used to offer "Finish
 * later" beside the camera; registration now requires the scan, so the only
 * way forward is a passing one. That is a rule about the FLOW, not about the
 * record: the customer is already written, so closing the browser here loses
 * nothing and their profile still carries the same scan for whoever has a
 * camera. What has gone is the wizard inviting it.
 *
 * The scan is not faked, skipped or assumed. `face_verified_at` is written by
 * the API only when a liveness sequence actually passes, and a customer who
 * leaves here without one is correctly reported as incomplete.
 */
export function FaceVerificationStep({
  customerName,
  verified,
  submitting,
  onCapture,
  onDone,
}: {
  customerId: string;
  customerName: string;
  /** Whether the account type demands it for KYC to be complete. */
  required: boolean;
  verified: boolean;
  submitting: boolean;
  onCapture: (file: File, report: FaceScanReport) => void;
  /** Where to go once the scan has passed. */
  onDone: () => void;
}) {
  const [capture, setCapture] = React.useState<File | null>(null);
  const [report, setReport] = React.useState<FaceScanReport | null>(null);

  if (verified) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5">
          <BadgeCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Face verification complete
            </p>
            <p className="text-sm text-muted-foreground">
              {customerName} has passed the liveness check. Their KYC is complete and they can now
              start a loan application.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onDone}>
            Open customer profile
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/customers/new">Register another customer</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Face Verification</h2>
        <p className="text-sm text-muted-foreground">
          {customerName} is saved. This is the last step, and the registration is not complete
          until the scan passes.
        </p>
      </div>

      {/* ------------------------------------------------ where it can be run */}
      {/* Not an invitation to skip: the step has no way past the scan. It says
          where the same check lives if this desk has no working camera, which
          is a fact about the deployment rather than a step in this flow. */}
      <div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
        <Smartphone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="space-y-1 text-sm">
          <p className="font-medium">This desk needs a camera.</p>
          <p className="text-muted-foreground">
            {customerName} is saved and reads{" "}
            <span className="font-medium text-foreground">Awaiting face verification</span> until
            this passes. If this machine has no camera, the same scan is on their profile and can be
            run by anyone signed in who may manage them.
          </p>
        </div>
      </div>

      <FaceScanner
        capture={capture}
        report={report}
        onCapture={(file, scanReport) => {
          setCapture(file);
          setReport(scanReport);
        }}
        onClear={() => {
          setCapture(null);
          setReport(null);
        }}
      />

      {/* One button. "Finish later" used to sit beside it, and this step is now
          compulsory — an exit here would be the wizard offering to leave a
          registration unfinished on the screen that exists to finish it. */}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          disabled={
            submitting ||
            capture === null ||
            report === null ||
            /* Only a passing scan is submitted. A failed one is a real record
               and the profile can take one — but a customer whose liveness was
               never confirmed must not be marked verified from here. */
            report.status !== "passed"
          }
          onClick={() => capture && report && onCapture(capture, report)}
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Complete face verification
        </Button>
      </div>

      {report !== null && report.status !== "passed" && (
        <p role="alert" className="text-xs text-destructive">
          The scan did not confirm liveness. Run it again before completing verification.
        </p>
      )}
    </div>
  );
}
