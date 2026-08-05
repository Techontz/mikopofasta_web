"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/domain/action-result";

interface ReasonDialogProps {
  trigger: React.ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  /** Offer a second, optional field for context — a case number, what was said. */
  withRemarks?: boolean;
  onConfirm: (reason: string, remarks?: string) => Promise<ActionResult>;
}

export function ReasonDialog({
  trigger,
  title,
  description,
  confirmLabel,
  destructive,
  withRemarks,
  onConfirm,
}: ReasonDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [remarks, setRemarks] = React.useState("");
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await onConfirm(reason, remarks.trim() || undefined);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        setReason("");
        setRemarks("");
      } else {
        toast.error(result.message ?? "Something went wrong.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setReason("");
          setRemarks("");
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="reason-dialog-textarea">Reason</Label>
          <Textarea
            id="reason-dialog-textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>
        {withRemarks && (
          <div className="space-y-1.5">
            <Label htmlFor="reason-dialog-remarks">Remarks (optional)</Label>
            <Textarea
              id="reason-dialog-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Case number, what the customer was told, anything a colleague would need."
            />
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={handleConfirm}
            disabled={pending || !reason.trim()}
            className={destructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
          >
            {pending ? "Submitting…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
