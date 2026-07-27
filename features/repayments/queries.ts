import "server-only";
import { MOCK_PAYMENTS } from "@/lib/mock-data/payments";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { customerFullName } from "@/types/customer";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS, type AuthenticatedUser } from "@/types/auth";
import type { Payment } from "@/types/repayment";
import type { PaymentRow } from "@/features/repayments/payments-table";

/**
 * Branch scoping — backend §13. Unmatched payments carry no branch yet, so
 * they stay visible to anyone who can see the suspense queue rather than
 * being hidden from every branch-scoped user.
 */
export function visiblePaymentsFor(user: AuthenticatedUser | null | undefined): Payment[] {
  if (!user) return [];
  if (hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL)) return MOCK_PAYMENTS;
  return MOCK_PAYMENTS.filter((p) => p.branchId === user.branchId || p.branchId === null);
}

export function toPaymentRow(payment: Payment): PaymentRow {
  const loan = payment.loanId ? MOCK_LOANS.find((l) => l.id === payment.loanId) : undefined;
  const customer = payment.customerId ? MOCK_CUSTOMERS.find((c) => c.id === payment.customerId) : undefined;
  const branch = payment.branchId ? MOCK_BRANCHES.find((b) => b.id === payment.branchId) : undefined;
  return {
    id: payment.id,
    paymentReference: payment.paymentReference,
    loanNumber: loan?.loanNumber ?? "—",
    customerName: customer ? customerFullName(customer) : "—",
    branchName: branch?.name ?? "—",
    amount: payment.amount,
    channel: payment.channel,
    status: payment.status,
    receivedAt: payment.receivedAt,
  };
}
