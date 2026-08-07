import "server-only";
import type { LoanListItem } from "@/lib/api/loans";
import type { LoanRow } from "@/features/loans/loans-table";

/**
 * The list row.
 *
 * Everything here is resolved by the API: `customerName`, `branchName` and
 * `productName` come eager-loaded, and `outstanding` is the server's own
 * `outstandingTotal`, summed in SQL over the loan's installments — zero until a
 * schedule exists, so a loan still in origination correctly shows no balance.
 *
 * Branch scoping has left this file entirely: §13 is applied by the API, so a
 * list is already narrowed to what the signed-in officer may see and there is
 * nothing here left to filter.
 */
export function toLoanRow(loan: LoanListItem, outstanding?: Map<string, number>): LoanRow {
  return {
    id: loan.id,
    loanNumber: loan.loanNumber,
    paymentReference: loan.paymentReference,
    customerName: loan.customerName ?? "—",
    branchName: loan.branchName ?? "—",
    productName: loan.productName ?? "—",
    principalAmount: loan.principalAmount,
    // The index resource carries the balance now, so `loan.outstanding` is the
    // figure. The map is still accepted because a caller that has already
    // narrowed a set — the Loan Book excludes closed loans from its tile —
    // passes the same values through it, and reading one source keeps the row
    // and the tile from disagreeing.
    outstanding: outstanding?.get(loan.id) ?? loan.outstanding,
    status: loan.status,
    disbursementDate: loan.disbursementDate,
  };
}
