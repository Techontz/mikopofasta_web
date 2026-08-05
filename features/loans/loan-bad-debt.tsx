"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { FileX2, HandCoins, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { ReasonDialog } from "@/features/customers/profile/reason-dialog";
import { formatMoney } from "@/lib/domain/money";
import { recordRecovery, writeOffLoan } from "@/features/accounting/actions";
import type { Recovery, WriteOff } from "@/types/accounting";
import type { LoanStatus } from "@/types/enums";

/**
 * Bad debt on the loan's own screen — §5's Write-Off and Recovered Loans.
 *
 * Built from the Loan module's components rather than the Settings ones,
 * because this renders inside the loan detail page and a screen that mixed two
 * design systems would read as two screens. The Treasury register uses the
 * Settings table for the same reason, in the other direction.
 */

/** One bank account the recovery may be banked into, supplied live. */
export interface RecoveryAccountOption {
  id: string;
  label: string;
}

/**
 * Write off a defaulted loan.
 *
 * Uses the loan module's ReasonDialog, which is exactly the shape this needs: a
 * required reason on a decision with consequences. The dialog states what
 * reaches the ledger and what does not, because only principal is posted —
 * uncollected interest and penalty were never recognised as income.
 */
export function WriteOffLoanAction({
  loanId,
  loanNumber,
  outstanding,
  status,
  canWriteOff,
}: {
  loanId: string;
  loanNumber: string;
  outstanding: number;
  status: LoanStatus;
  canWriteOff: boolean;
}) {
  if (status !== "defaulted") return null;

  if (!canWriteOff) {
    return (
      <p className="text-sm text-muted-foreground">
        This loan is in default. Writing it off needs the <code>loans.write_off</code> permission, which the
        originating roles deliberately do not hold.
      </p>
    );
  }

  return (
    <ReasonDialog
      trigger={
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
          <FileX2 className="size-4" />
          Write off
        </Button>
      }
      title={`Write off ${loanNumber}?`}
      description={`Posts Dr Write-Off Expense · Cr Loan Receivable for the outstanding principal of ${formatMoney(outstanding)}. Uncollected interest and penalty are recorded as forgone but not posted — they were never recognised as income. This cannot be undone.`}
      confirmLabel="Write off loan"
      destructive
      onConfirm={(reason) => writeOffLoan(loanId, { reason })}
    />
  );
}

/**
 * Record money recovered on a written-off loan.
 *
 * Not a repayment — the receivable is gone, so this credits Recovered Loans
 * rather than allocating against a schedule. Instalments are expected, so the
 * dialog stays usable after a success and each submission carries its own
 * idempotency token.
 */
export function RecordRecoveryAction({
  loanId,
  loanNumber,
  outstanding,
  accounts,
  canRecover,
}: {
  loanId: string;
  loanNumber: string;
  /** What remains unrecovered against the write-off. */
  outstanding: number;
  accounts: RecoveryAccountOption[];
  canRecover: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [accountId, setAccountId] = React.useState("default");
  const [narrative, setNarrative] = React.useState("");
  const [pending, startTransition] = useTransition();

  if (!canRecover) {
    return (
      <p className="text-sm text-muted-foreground">
        Recording a recovery needs the <code>loans.recover</code> permission.
      </p>
    );
  }

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;

  function reset() {
    setAmount("");
    setAccountId("default");
    setNarrative("");
  }

  function onConfirm() {
    startTransition(async () => {
      const result = await recordRecovery(
        loanId,
        {
          amount: value,
          bankAccountId: accountId === "default" ? undefined : accountId,
          narrative: narrative.trim() || undefined,
        },
        /*
         * A fresh token per submission. Two instalments of the same amount are
         * two genuine recoveries, so keying on the loan alone would make the
         * second look like a retry of the first and swallow it.
         */
        crypto.randomUUID()
      );

      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        reset();
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
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <HandCoins className="size-4" />
            Record recovery
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a recovery on {loanNumber}</DialogTitle>
          <DialogDescription>
            Money that came back after the write-off. Credited to Recovered Loans, not to the loan — the
            receivable was already cleared. {formatMoney(outstanding)} is still being chased.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recovery-amount">Amount recovered</Label>
            <Input
              id="recovery-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recovery-account">Bank account</Label>
            {/* Base UI hands back null when a select is cleared; there is no
                clear affordance here, so the fallback is the default account. */}
            <Select value={accountId} onValueChange={(value) => setAccountId(value ?? "default")}>
              <SelectTrigger id="recovery-account">
                {/*
                  A render function, not a bare <SelectValue />.
                  Base UI renders the raw VALUE by default, and these values are
                  bank-account ids — so the trigger read "1" once an account was
                  chosen, telling the user nothing about which account they had
                  picked. Every other id-valued select in the app maps the value
                  back to its label the same way.
                */}
                <SelectValue>
                  {(v: string) =>
                    v === "default"
                      ? "Default account"
                      : (accounts.find((a) => a.id === v)?.label ?? "Default account")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default account</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recovery-narrative">Narrative</Label>
            <Textarea
              id="recovery-narrative"
              rows={2}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="How the money was recovered — a settlement, say."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!valid || pending}>
            {pending ? "Recording…" : "Record recovery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * What was written off and what has come back — the loan's own bad-debt tab.
 */
export function LoanBadDebtPanel({
  writeOff,
  recoveries,
}: {
  writeOff: WriteOff | null;
  recoveries: Recovery[];
}) {
  if (writeOff === null) {
    return (
      <EmptyState
        icon={ScrollText}
        title="This loan has not been written off"
        description="A loan must reach default before it can be written off, and recoveries are only recorded against a write-off."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <Fact label="Principal written off" value={formatMoney(writeOff.principalWrittenOff)} />
        <Fact label="Interest forgone" value={formatMoney(writeOff.interestForgone)} />
        <Fact label="Recovered" value={formatMoney(writeOff.recoveredToDate)} />
        <Fact label="Still chasing" value={formatMoney(writeOff.outstanding)} />
      </div>

      <div className="rounded-lg border p-3 text-sm">
        <p className="font-medium text-foreground">Reason</p>
        <p className="mt-1 text-muted-foreground">{writeOff.reason}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Written off by {writeOff.approvedByName ?? "—"}
          {writeOff.journalEntryId ? ` · Journal entry #${writeOff.journalEntryId}` : " · Nothing to post"}
        </p>
      </div>

      {recoveries.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No recoveries yet"
          description="Money recovered after the write-off is recorded here, instalment by instalment."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Narrative</TableHead>
                <TableHead>Recorded by</TableHead>
                <TableHead>Ledger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recoveries.map((recovery) => (
                <TableRow key={recovery.id}>
                  <TableCell className="font-medium">{formatMoney(recovery.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{recovery.narrative ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{recovery.recordedByName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {recovery.journalEntryId ? `JE #${recovery.journalEntryId}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
