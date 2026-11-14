"use client";

import Link from "next/link";

import { money } from "@/lib/format";

import type { DebtClearance } from "./types";

/**
 * Existing debts of the customer that this loan's payout deducts and settles: previous loans, Salary Advance, unpaid
 * penalties and other eligible debts, with the net amount payable. Shown during approval; Finance's payout recalculates
 * it from the latest confirmed balances.
 */
export function DebtClearanceTable({ clearance }: { clearance: DebtClearance }) {
  const { totals } = clearance;

  return (
    <>
      <h6 className="mb-2">Existing debts deducted from this loan</h6>
      <div className="table-responsive">
        <table className="table table-sm mb-0">
          <tbody>
            <tr><td>Previous Loan Outstanding</td><td className="text-right">{money(totals.previous_loans)}</td></tr>
            <tr><td>Salary Advance Outstanding</td><td className="text-right">{money(totals.salary_advance)}</td></tr>
            <tr><td>Unpaid Penalties</td><td className="text-right">{money(totals.penalties)}</td></tr>
            <tr><td>Other Eligible Debts</td><td className="text-right">{money(totals.other)}</td></tr>
            <tr className="font-weight-bold"><td>Total Existing Debts</td><td className="text-right">{money(totals.total_debts)}</td></tr>
            <tr><td>Approved Loan Amount</td><td className="text-right">{money(clearance.approved)}</td></tr>
            <tr><td>Loan Fee (deducted)</td><td className="text-right">{money(clearance.loan_fee)}</td></tr>
            <tr className="font-weight-bold"><td>Net Amount Payable to Customer</td><td className="text-right">{money(Math.max(0, clearance.net))}</td></tr>
          </tbody>
        </table>
      </div>
      {(clearance.loans.length > 0 || clearance.salary_advances.length > 0 || clearance.penalties.length > 0) && (
        <small className="d-block text-muted mt-1">
          {clearance.loans.map((row) => <span key={`l${row.id}`} className="mr-3">Loan <Link href={`/loans/${row.id}`}>{row.loan_number}</Link>{row.legacy ? " (old system)" : ""}: {money(row.amount)}{row.penalty > 0 ? ` incl. penalty ${money(row.penalty)}` : ""}</span>)}
          {clearance.salary_advances.map((row) => <span key={`a${row.id}`} className="mr-3">Salary Advance {row.reference}{row.legacy ? " (old system)" : ""}: {money(row.amount)}</span>)}
          {clearance.penalties.map((row) => <span key={`p${row.id}`} className="mr-3">Penalty {row.date ?? ""}{row.legacy ? " (old system)" : ""}: {money(row.amount)}</span>)}
        </small>
      )}
      {clearance.exceeds && (
        <div className="alert alert-danger py-2 mt-2 mb-0">The existing debts reach the loan proceeds. The disbursement will be stopped until part of the debts is settled.</div>
      )}
      {!clearance.exceeds && totals.total_debts > 0 && (
        <p className="small text-muted mt-2 mb-0">These debts are settled only when the loan is paid out, using the balances confirmed at that moment.</p>
      )}
    </>
  );
}
