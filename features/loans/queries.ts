import "server-only";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { MOCK_LOAN_SCHEDULES } from "@/lib/mock-data/payments";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { MOCK_LOAN_PRODUCTS } from "@/lib/mock-data/loan-products";
import { customerFullName } from "@/types/customer";
import { scheduleOutstanding } from "@/types/loan";
import { round2 } from "@/lib/domain/money";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS, type AuthenticatedUser } from "@/types/auth";
import type { Loan } from "@/types/loan";
import type { LoanRow } from "@/features/loans/loans-table";

/**
 * Outstanding is only meaningful once money has actually moved. A schedule
 * exists from manager approval onward (§6), but until the disbursement
 * callback confirms, nothing is owed — reporting a balance before then would
 * overstate the portfolio.
 */
export function loanOutstanding(loanId: string): number {
  const loan = MOCK_LOANS.find((l) => l.id === loanId);
  if (!loan?.disbursementDate) return 0;
  return round2(
    MOCK_LOAN_SCHEDULES.filter((s) => s.loanId === loanId).reduce((sum, s) => sum + scheduleOutstanding(s).total, 0)
  );
}

/**
 * Branch scoping — backend §13: every role is branch-scoped unless it holds
 * BRANCHES_VIEW_ALL. Applied here once so the list page and any future
 * loan-derived report can't accidentally leak another branch's book.
 */
export function visibleLoansFor(user: AuthenticatedUser | null | undefined): Loan[] {
  const live = MOCK_LOANS.filter((l) => l.deletedAt === null);
  if (!user) return [];
  if (hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL)) return live;
  return live.filter((l) => l.branchId === user.branchId);
}

export function toLoanRow(loan: Loan): LoanRow {
  const customer = MOCK_CUSTOMERS.find((c) => c.id === loan.customerId);
  const branch = MOCK_BRANCHES.find((b) => b.id === loan.branchId);
  const product = MOCK_LOAN_PRODUCTS.find((p) => p.id === loan.loanProductId);
  return {
    id: loan.id,
    loanNumber: loan.loanNumber,
    customerName: customer ? customerFullName(customer) : "—",
    branchName: branch?.name ?? "—",
    productName: product?.name ?? "—",
    principalAmount: loan.principalAmount,
    outstanding: loanOutstanding(loan.id),
    status: loan.status,
    disbursementDate: loan.disbursementDate,
  };
}
