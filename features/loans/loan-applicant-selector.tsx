"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Info, UserSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import { SettingsCard } from "@/components/settings";
import type { CustomerListItem } from "@/lib/api/customers";

/**
 * Loan → Loan Application: choose who is borrowing.
 *
 * WHY THIS EXISTS RATHER THAN THE TABLE ALONE. The screen was a filterable
 * list, which is the right shape for browsing a book and the wrong one for the
 * single question being asked here — "which customer?". An officer who knows
 * the name is made to read a table; an officer whose branch has four hundred
 * eligible customers is made to page through them. A combobox answers the
 * question in one keystroke, and the table stays underneath for the times when
 * browsing genuinely is what you want.
 *
 * WHO IS OFFERED. Only customers the API reports as loan-eligible — it applies
 * `Customer::isLoanEligible()` through the `loan_eligible` filter, so this list
 * cannot include somebody the next screen would refuse. Nothing about the rule
 * is decided here; if it were, this component and the loan gate would drift and
 * an officer would be sent down a dead end.
 *
 * That chain is, in full:
 *
 *     registered → KYC complete → face verified → registration APPROVED
 *     → active account → offered here
 *
 * THE SELECTOR IS ALWAYS RENDERED, including when nothing matches. An empty
 * screen that says only "no customers" invites the reading that the feature is
 * broken. The control stays, disabled, and says which part of the chain the
 * branch's customers have not yet reached.
 */
export function LoanApplicantSelector({
  customers,
  pendingApprovalCount,
  awaitingKycCount,
}: {
  /** Already narrowed by the API to those who may borrow. */
  customers: CustomerListItem[];
  /** Registrations finished and waiting on a manager — the usual reason this list is short. */
  pendingApprovalCount: number;
  /** Registrations not yet finished, so not yet anybody's to approve. */
  awaitingKycCount: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string | null>(null);

  const chosen = customers.find((c) => c.id === selected) ?? null;
  const none = customers.length === 0;

  /*
   * Name, number and phone all in the label, because the combobox filters on
   * the label text and those are the three things an officer is handed. A
   * customer known only by the number on a repayment slip is found by typing
   * it, exactly as one known by name is.
   */
  const options = customers.map((c) => ({
    value: c.id,
    label: `${c.fullName} · ${c.customerNumber} · ${c.phone}`,
    hint: [c.branchName, c.categoryName].filter(Boolean).join(" · ") || undefined,
  }));

  function start() {
    if (!chosen) return;
    /* The choice travels. The old Start button linked to the form and carried
       nothing, so the officer picked a customer and then picked them again. */
    router.push(`/loans/new/apply?customerId=${encodeURIComponent(chosen.id)}`);
  }

  return (
    <SettingsCard
      title="Start a loan application"
      description="Search by customer name, customer number or phone number."
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="loan-applicant">Customer</Label>
            <Combobox
              id="loan-applicant"
              value={selected}
              onChange={setSelected}
              options={options}
              disabled={none}
              disabledMessage="No customer is eligible to borrow yet"
              placeholder="Search name, customer number or phone…"
              emptyMessage="No eligible customer matches that search."
            />
          </div>

          <Button type="button" onClick={start} disabled={!chosen}>
            Start Application
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>

        {/* The chosen customer, confirmed before the officer commits. */}
        {chosen && (
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{chosen.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {chosen.customerNumber} · {chosen.phone}
              {chosen.branchName ? ` · ${chosen.branchName}` : ""}
              {chosen.categoryName ? ` · ${chosen.categoryName}` : ""}
            </p>
          </div>
        )}

        {/*
          Why the list is empty, in the terms of the workflow rather than as a
          shrug. Each line is actionable by somebody, and says by whom.
        */}
        {none && (
          <div className="space-y-2 rounded-lg border border-dashed p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <UserSearch className="size-4 text-muted-foreground" aria-hidden />
              No customer can borrow yet
            </p>
            <p className="text-xs text-muted-foreground">
              A customer becomes available here only after the whole chain is complete: registered →
              KYC complete → face verified → <span className="font-medium">registration approved by
              a Branch Manager</span> → account active.
            </p>

            <ul className="space-y-1 pt-1 text-xs">
              {pendingApprovalCount > 0 && (
                <li className="flex items-start gap-1.5">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-indigo-600" aria-hidden />
                  <span>
                    <span className="font-medium">{pendingApprovalCount}</span> registration
                    {pendingApprovalCount === 1 ? " is" : "s are"} finished and waiting for a Branch
                    Manager to approve.{" "}
                    <Link href="/customers/approvals" className="underline underline-offset-2">
                      Open registration approvals
                    </Link>
                  </span>
                </li>
              )}
              {awaitingKycCount > 0 && (
                <li className="flex items-start gap-1.5">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
                  <span>
                    <span className="font-medium">{awaitingKycCount}</span> registration
                    {awaitingKycCount === 1 ? " is" : "s are"} still incomplete — usually the face
                    scan.{" "}
                    <Link href="/customers" className="underline underline-offset-2">
                      Open customers
                    </Link>
                  </span>
                </li>
              )}
              {pendingApprovalCount === 0 && awaitingKycCount === 0 && (
                <li className="flex items-start gap-1.5">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span>
                    There are no registrations in progress either.{" "}
                    <Link href="/customers/new" className="underline underline-offset-2">
                      Register a customer
                    </Link>{" "}
                    to begin.
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
