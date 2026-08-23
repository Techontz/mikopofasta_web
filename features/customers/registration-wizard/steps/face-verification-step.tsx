"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, Clock, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaceScanner } from "@/features/customers/registration-wizard/face-scanner/face-scanner";
import type { FaceScanReport } from "@/features/customers/registration-wizard/face-scanner/face-report";

/**
 * Step 6 — Face Verification. The last step, and deliberately after the save.
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
 * verification". So this screen has three honest exits:
 *
 *   1. Scan now, on this device.
 *   2. Leave it. The officer walks away and nothing is lost.
 *   3. Do it elsewhere — the same capability is on the customer's own profile,
 *      reachable by anyone signed in with the right to manage that customer,
 *      on any device with a camera. Nothing about it depends on this browser
 *      session still being open.
 *
 * The scan is not faked, skipped or assumed. `face_verified_at` is written by
 * the API only when a liveness sequence actually passes, and a customer who
 * leaves here without one is correctly reported as incomplete.
 */
export function FaceVerificationStep({
  customerId,
  customerName,
  required,
  verified,
  submitting,
  onCapture,
  onFinishLater,
}: {
  customerId: string;
  customerName: string;
  /** Whether the account type demands it for KYC to be complete. */
  required: boolean;
  verified: boolean;
  submitting: boolean;
  onCapture: (file: File, report: FaceScanReport) => void;
  onFinishLater: () => void;
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
          <Button
            nativeButton={false}
            render={<Link href={`/customers/${customerId}`}>Open customer profile</Link>}
          />
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
          {customerName} is saved. This is the last step
          {required ? " and the only one still outstanding." : ", and optional for this account type."}
        </p>
      </div>

      {/* ------------------------------------------------ the other-device path */}
      <div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
        <Smartphone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="space-y-1 text-sm">
          <p className="font-medium">You do not have to do this here.</p>
          <p className="text-muted-foreground">
            The customer is already saved with the status{" "}
            <span className="font-medium text-foreground">Awaiting face verification</span>. Anyone
            signed in who can manage this customer — on a phone, a tablet, another desk — can open
            their profile and run the scan there. Nothing depends on this window staying open.
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

      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline" onClick={onFinishLater} disabled={submitting}>
          <Clock className="size-4" />
          Finish later
        </Button>

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
