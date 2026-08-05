"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FaceScanner } from "@/features/customers/registration-wizard/face-scanner/face-scanner";
import {
  appendReport,
  type FaceScanReport,
} from "@/features/customers/registration-wizard/face-scanner/face-report";
import { verifyCustomerFace } from "@/features/customers/actions";

/**
 * Running a face scan against a customer who already exists.
 *
 * Two entry points share this dialog because they are the same operation seen
 * from two directions:
 *
 *   - **Re-scan** — the verification is being redone. The photograph on file
 *     may be years old, or the last scan failed. A reason is useful but not
 *     demanded.
 *   - **Replace** — the photograph on file is being deliberately superseded,
 *     usually because it no longer resembles the customer or was taken of the
 *     wrong person. That is a decision somebody will be asked about, so a
 *     reason is required before the button will submit.
 *
 * Neither deletes anything. The previous scan keeps its row and its image; the
 * new one becomes active. What separates the two is what gets written into
 * `reason`, which is exactly the field an investigator reads first.
 */
export function FaceScanDialog({
  customerId,
  mode,
  open,
  onOpenChange,
}: {
  customerId: string;
  mode: "rescan" | "replace";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [capture, setCapture] = React.useState<File | null>(null);
  const [report, setReport] = React.useState<FaceScanReport | null>(null);
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const replacing = mode === "replace";
  const reasonMissing = replacing && reason.trim().length === 0;

  /* No reset effect is needed: the profile mounts this dialog only while it
     is open, so a capture from a scan the officer abandoned goes with it. */

  async function submit() {
    if (!capture || !report) return;

    setSaving(true);
    const form = new FormData();
    form.append("capture", capture);
    appendReport(form, report, reason.trim() || (replacing ? null : "Re-scan"));

    const result = await verifyCustomerFace(customerId, form);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "The scan could not be recorded.");
      return;
    }

    toast.success(result.message);
    onOpenChange(false);
    /* The panel reads a server component's data, so the page has to re-fetch
       before the new scan appears in the history. */
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{replacing ? "Replace face image" : "Re-scan face"}</DialogTitle>
          <DialogDescription>
            {replacing
              ? "The current image stays on the record as history. The new scan becomes the active one."
              : "The customer turns their head through five positions on a live camera. Nothing is uploaded until you save."}
          </DialogDescription>
        </DialogHeader>

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
          disabled={saving}
          /* A customer who cannot complete the sequence is a real outcome a
             branch has to be able to record. The API refuses to mark them
             verified on it, so writing it down costs nothing and hiding it
             would leave the record silent about a failed check. */
          allowFailedResult
        />

        <div className="space-y-1.5">
          <Label htmlFor="face-scan-reason">
            Reason {replacing ? <span className="text-destructive">*</span> : "(optional)"}
          </Label>
          <Textarea
            id="face-scan-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={
              replacing
                ? "Why is the current image being replaced?"
                : "e.g. annual re-verification"
            }
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!capture || !report || reasonMissing || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {report?.status === "failed" ? "Record failed scan" : "Save scan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
