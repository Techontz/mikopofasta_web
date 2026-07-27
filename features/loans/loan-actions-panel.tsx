"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { BadgeCheck, Ban, CheckCircle2, Loader2, RefreshCw, Send, ShieldCheck, ThumbsDown, ThumbsUp, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReasonDialog } from "@/features/customers/profile/reason-dialog";
import {
  cancelLoan,
  closeLoan,
  decideLoanApproval,
  prepareDisbursement,
  retryDisbursement,
  retryMandate,
  runTelcoVerification,
  settleDisbursement,
  verifyMandateOtp,
} from "@/features/loans/actions";
import { DISBURSEMENT_CHANNELS, type DisbursementChannel, type LoanStatus } from "@/types/enums";
import type { ActionResult } from "@/lib/domain/action-result";

export interface LoanPermissions {
  canApprove: boolean;
  canCreditReview: boolean;
  canDisburse: boolean;
  isOwnApplication: boolean;
}

export function LoanActionsPanel({
  loanId,
  status,
  outstanding,
  permissions,
}: {
  loanId: string;
  status: LoanStatus;
  outstanding: number;
  permissions: LoanPermissions;
}) {
  const [pending, startTransition] = useTransition();
  const [otp, setOtp] = React.useState("");
  const [channel, setChannel] = React.useState<DisbursementChannel>("vodacom");

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  const actions: React.ReactNode[] = [];

  if (status === "pending_manager_approval") {
    if (!permissions.canApprove) {
      actions.push(<Note key="no-approve">Awaiting a Branch Manager to review this application.</Note>);
    } else if (permissions.isOwnApplication) {
      actions.push(
        <Note key="sod" tone="warn">
          You submitted this application, so you can&apos;t approve it — separation of duties requires a different approver.
        </Note>
      );
    } else {
      actions.push(
        <div key="approve" className="flex flex-wrap gap-2">
          <Button size="sm" disabled={pending} onClick={() => run(() => decideLoanApproval(loanId, "approve"))}>
            <ThumbsUp className="size-4" />
            Approve
          </Button>
          <ReasonDialog
            trigger={
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                <ThumbsDown className="size-4" />
                Reject
              </Button>
            }
            title="Reject this loan application?"
            description="The applicant will be notified and the loan closed as rejected."
            confirmLabel="Reject Loan"
            destructive
            onConfirm={(reason) => decideLoanApproval(loanId, "reject", reason)}
          />
        </div>
      );
    }
  }

  if (status === "mandate_pending_otp") {
    actions.push(
      <div key="mandate" className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="mandate-otp">Bank E-Mandate OTP</Label>
          <Input id="mandate-otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="654321" maxLength={6} className="w-40" />
        </div>
        <Button size="sm" disabled={pending || otp.length !== 6} onClick={() => run(() => verifyMandateOtp(loanId, otp))}>
          <ShieldCheck className="size-4" />
          Verify Mandate
        </Button>
      </div>
    );
  }

  if (status === "mandate_failed") {
    actions.push(
      <Button key="retry-mandate" size="sm" variant="outline" disabled={pending} onClick={() => run(() => retryMandate(loanId))}>
        <RefreshCw className="size-4" />
        Retry E-Mandate
      </Button>
    );
  }

  if (status === "pending_credit_review") {
    if (!permissions.canCreditReview) {
      actions.push(<Note key="no-credit">Awaiting a Credit Officer to run telco verification.</Note>);
    } else {
      actions.push(
        <div key="telco" className="flex flex-wrap gap-2">
          <Button size="sm" disabled={pending} onClick={() => run(() => runTelcoVerification(loanId, true))}>
            <BadgeCheck className="size-4" />
            Telco Verification Passed
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={pending}
            onClick={() => run(() => runTelcoVerification(loanId, false))}
          >
            <XCircle className="size-4" />
            Verification Failed
          </Button>
        </div>
      );
    }
  }

  if (status === "pending_finance") {
    if (!permissions.canDisburse) {
      actions.push(<Note key="no-fin">Awaiting Finance to prepare the disbursement batch.</Note>);
    } else {
      actions.push(
        <div key="prepare" className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => v && setChannel(v as DisbursementChannel)}>
              <SelectTrigger className="w-40">
                <SelectValue className="capitalize" />
              </SelectTrigger>
              <SelectContent>
                {DISBURSEMENT_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" disabled={pending} onClick={() => run(() => prepareDisbursement(loanId, channel))}>
            <Send className="size-4" />
            Prepare Disbursement
          </Button>
        </div>
      );
    }
  }

  if (status === "awaiting_disbursement" && permissions.canDisburse) {
    actions.push(
      <div key="settle" className="space-y-2">
        <Note>
          The batch is with the provider. The system never assumes success — the provider callback decides. Simulate it below.
        </Note>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={pending} onClick={() => run(() => settleDisbursement(loanId, true))}>
            <CheckCircle2 className="size-4" />
            Simulate Success Callback
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={pending}
            onClick={() => run(() => settleDisbursement(loanId, false, "Provider returned INSUFFICIENT_FLOAT"))}
          >
            <XCircle className="size-4" />
            Simulate Failure Callback
          </Button>
        </div>
      </div>
    );
  }

  if (status === "disbursement_failed" && permissions.canDisburse) {
    actions.push(
      <Button key="retry-disb" size="sm" disabled={pending} onClick={() => run(() => retryDisbursement(loanId))}>
        <RefreshCw className="size-4" />
        Retry Disbursement
      </Button>
    );
  }

  if (status === "escalated") {
    actions.push(
      <Note key="escalated" tone="warn">
        Escalated after the maximum disbursement attempts. A manual decision is required — retry through an alternate channel or cancel.
      </Note>
    );
    if (permissions.canDisburse) {
      actions.push(
        <Button key="escalated-retry" size="sm" variant="outline" disabled={pending} onClick={() => run(() => retryDisbursement(loanId))}>
          <RefreshCw className="size-4" />
          Retry via Alternate Channel
        </Button>
      );
    }
  }

  if ((status === "active" || status === "arrears") && permissions.canApprove) {
    actions.push(
      <div key="close" className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending || outstanding > 0.01} onClick={() => run(() => closeLoan(loanId, 30))}>
          <CheckCircle2 className="size-4" />
          Close Loan
        </Button>
        {outstanding > 0.01 && <Note>Loan can only be closed once fully repaid.</Note>}
      </div>
    );
  }

  const cancellable: LoanStatus[] = ["draft", "mandate_failed", "disbursement_failed", "escalated"];
  if (cancellable.includes(status) && permissions.canApprove) {
    actions.push(
      <ReasonDialog
        key="cancel"
        trigger={
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
            <Ban className="size-4" />
            Cancel Loan
          </Button>
        }
        title="Cancel this loan?"
        description="No money has moved. The loan will be closed as cancelled and cannot be reopened."
        confirmLabel="Cancel Loan"
        destructive
        onConfirm={(reason) => cancelLoan(loanId, reason)}
      />
    );
  }

  if (actions.length === 0) {
    return <Note>No actions are available to you for a loan in this state.</Note>;
  }

  return (
    <div className="space-y-3">
      {pending && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Working…
        </p>
      )}
      {actions}
    </div>
  );
}

function Note({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "warn" }) {
  return (
    <p
      className={
        tone === "warn"
          ? "rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400"
          : "text-sm text-muted-foreground"
      }
    >
      {children}
    </p>
  );
}
