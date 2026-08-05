"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Undo2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReasonDialog } from "@/features/customers/profile/reason-dialog";
import { ConfirmDialog } from "@/components/settings/dialog";
import { formatMoney } from "@/lib/domain/money";
import {
  cancelLoan,
  closeLoan,
  decideApproval,
  prepareDisbursement,
  resubmitLoan,
  retryDisbursement,
  retryMandate,
  runTelcoVerification,
  settleDisbursement,
  settleLoanEarly,
  verifyMandateOtp,
} from "@/features/loans/actions";
import { DISBURSEMENT_CHANNELS, type DisbursementChannel, type LoanStatus } from "@/types/enums";
import type { ActionResult } from "@/lib/domain/action-result";
import type { ApprovalDecision, EarlySettlementQuote, LoanApprovalState } from "@/lib/api/loans";

export interface LoanPermissions {
  canApprove: boolean;
  canCreditReview: boolean;
  canDisburse: boolean;
  canSettleEarly: boolean;
  isOwnApplication: boolean;
}

export function LoanActionsPanel({
  loanId,
  status,
  outstanding,
  permissions,
  approval,
  settlement,
}: {
  loanId: string;
  status: LoanStatus;
  outstanding: number;
  permissions: LoanPermissions;
  /**
   * Where the loan sits in the approval chain, and what this user may do.
   *
   * Optional so the panel still renders on pages that do not fetch it — a
   * loan past origination has no approval state worth asking for.
   */
  approval?: LoanApprovalState | null;
  /**
   * What settling today would cost. Absent for a loan that cannot be settled,
   * which is why the button is gated on it rather than on the status alone.
   */
  settlement?: EarlySettlementQuote | null;
}) {
  const [pending, startTransition] = useTransition();
  const [otp, setOtp] = React.useState("");
  const [channel, setChannel] = React.useState<DisbursementChannel>("vodacom");
  const [settleOpen, setSettleOpen] = React.useState(false);

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  const actions: React.ReactNode[] = [];

  /*
   * The approval chain — Branch Manager → Zone Manager → Head Office Credit.
   *
   * Which decisions appear is the API's answer, not a rule re-derived here:
   * `availableDecisions` comes from the same check that would refuse the write,
   * so a button is never offered that the server would reject, and never hidden
   * from someone entitled to press it.
   */
  if (approval) {
    const can = (decision: ApprovalDecision | "resubmit") => approval.availableDecisions.includes(decision);

    if (approval.currentStage) {
      const position = approval.chain.findIndex((s) => s.code === approval.currentStage?.code) + 1;

      actions.push(
        <Note key="stage">
          Stage {position} of {approval.chain.length} — {approval.currentStage.name}.
        </Note>
      );
    }

    if (approval.currentStage && !approval.canDecide) {
      actions.push(
        permissions.isOwnApplication ? (
          <Note key="sod" tone="warn">
            You submitted this application, so you can&apos;t decide it — separation of duties requires a different
            approver at every stage.
          </Note>
        ) : (
          <Note key="no-approve">Awaiting the {approval.currentStage.name} to review this application.</Note>
        )
      );
    }

    /*
     * At the credit stage, clearing and declining are the telco verification
     * buttons below — that decision is a CHECK, and offering a bare "Approve"
     * beside it would let a Credit Officer clear the stage without running the
     * verification the stage exists for. Return and Hold still apply.
     *
     * The API permits either path; this is the UI declining to offer the one
     * that skips the check.
     */
    const clearedByVerification = status === "pending_credit_review";

    if ((can("approved") && !clearedByVerification) || (can("rejected") && !clearedByVerification) || can("held")) {
      actions.push(
        <div key="decide" className="flex flex-wrap gap-2">
          {can("approved") && !clearedByVerification && (
            <Button size="sm" disabled={pending} onClick={() => run(() => decideApproval(loanId, "approved"))}>
              <ThumbsUp className="size-4" />
              Approve
            </Button>
          )}
          {can("rejected") && !clearedByVerification && (
            <ReasonDialog
              trigger={
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                  <ThumbsDown className="size-4" />
                  Reject
                </Button>
              }
              title="Reject this loan application?"
              description="The applicant will be notified and the loan closed as rejected. This cannot be undone."
              confirmLabel="Reject Loan"
              destructive
              onConfirm={(reason) => decideApproval(loanId, "rejected", reason)}
            />
          )}
          {can("returned_for_modification") && (
            <ReasonDialog
              trigger={
                <Button size="sm" variant="outline">
                  <Undo2 className="size-4" />
                  Return for Modification
                </Button>
              }
              title="Return this application to the officer?"
              description="The officer can correct it and resubmit. Any schedule generated so far is discarded, and the application re-enters the chain from the first stage."
              confirmLabel="Return Application"
              onConfirm={(reason) => decideApproval(loanId, "returned_for_modification", reason)}
            />
          )}
          {can("held") && (
            <ReasonDialog
              trigger={
                <Button size="sm" variant="outline">
                  <PauseCircle className="size-4" />
                  Hold
                </Button>
              }
              title="Put this application on hold?"
              description="Nothing changes except that the decision pauses. Releasing it later returns it to this exact stage."
              confirmLabel="Hold Application"
              onConfirm={(reason) => decideApproval(loanId, "held", reason)}
            />
          )}
        </div>
      );
    }

    if (can("released")) {
      actions.push(
        <div key="release" className="space-y-2">
          <Note tone="warn">
            On hold at the {approval.decisions.at(-1)?.stageName ?? "current"} stage
            {approval.decisions.at(-1)?.reason ? ` — ${approval.decisions.at(-1)?.reason}` : ""}.
          </Note>
          <Button size="sm" disabled={pending} onClick={() => run(() => decideApproval(loanId, "released"))}>
            <PlayCircle className="size-4" />
            Release from Hold
          </Button>
        </div>
      );
    }

    if (can("resubmit")) {
      actions.push(
        <div key="resubmit" className="space-y-2">
          <Note tone="warn">
            Returned for modification
            {approval.decisions.at(-1)?.reason ? ` — ${approval.decisions.at(-1)?.reason}` : ""}.
          </Note>
          <Button size="sm" disabled={pending} onClick={() => run(() => resubmitLoan(loanId))}>
            <Send className="size-4" />
            Resubmit for Approval
          </Button>
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
              <SelectTrigger aria-label="Channel" className="w-40">
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

  /*
   * "Close Loan Early" — client Decision 1, Option B.
   *
   * Offered alongside the ordinary close, and deliberately distinct from it:
   * this one ends a loan that still owes money, by charging what has been
   * earned and forgiving what has not. The figures come from the server's
   * quote, so the officer reads the customer the number the system will charge.
   */
  if ((status === "active" || status === "arrears") && settlement && permissions.canSettleEarly) {
    actions.push(
      <div key="settle" className="space-y-2">
        <Note>
          Settling today: {formatMoney(Number(settlement.payable))} — {formatMoney(Number(settlement.principal))}{" "}
          principal and {formatMoney(Number(settlement.interestEarned))} interest earned.{" "}
          {formatMoney(Number(settlement.interestWaived))} of future interest is waived and{" "}
          {settlement.installmentsCancelled} installment{settlement.installmentsCancelled === 1 ? "" : "s"} cancelled.
          {Number(settlement.advanceHeld) > 0 && (
            <> {formatMoney(Number(settlement.advanceHeld))} of held advance is applied first.</>
          )}
        </Note>
        <ConfirmDialog
          open={settleOpen}
          onOpenChange={setSettleOpen}
          trigger={
            <Button size="sm" variant="outline">
              <BadgeCheck className="size-4" />
              Close Loan Early
            </Button>
          }
          title="Settle and close this loan today?"
          consequence={
            <>
              The customer pays {formatMoney(Number(settlement.cashRequired))} now.{" "}
              {settlement.installmentsCancelled} future installment
              {settlement.installmentsCancelled === 1 ? " is" : "s are"} cancelled and{" "}
              {formatMoney(Number(settlement.interestWaived))} of interest is waived. This cannot be undone.
            </>
          }
          confirmLabel="Settle and Close"
          pending={pending}
          onConfirm={() => {
            setSettleOpen(false);
            run(() => settleLoanEarly(loanId, settlement.cashRequired));
          }}
        />
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
