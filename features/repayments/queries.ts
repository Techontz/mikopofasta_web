import "server-only";
import { getAllCustomers } from "@/lib/api/customers";
import { getBranches } from "@/lib/api/organization";
import type { PaymentListItem } from "@/lib/api/payments";
import type { PaymentRow } from "@/features/repayments/payments-table";

export interface NameLookups {
  customers: Map<string, string>;
  branches: Map<string, string>;
}

/**
 * Customer and branch names for the payments list.
 *
 * `PaymentResource` carries only their ids, so the names have to come from
 * elsewhere — and "elsewhere" is not reachable by every role that can read
 * payments. A Teller holds `repayments.view` and `repayments.cash_entry` and
 * nothing else, so `/customers` answers them 403. Both lookups therefore fail
 * soft: the column reads "—" instead of the page dying on a permission the
 * screen never needed in the first place.
 */
export async function getNameLookups(): Promise<NameLookups> {
  const [customers, branches] = await Promise.all([
    getAllCustomers().catch(() => []),
    getBranches().catch(() => []),
  ]);

  return {
    customers: new Map(customers.map((c) => [c.id, c.fullName])),
    branches: new Map(branches.map((b) => [b.id, b.name])),
  };
}

/**
 * The payments list row. `loanNumber` comes eager-loaded with the payment.
 *
 * Branch scoping has left this file: §13 is applied by the API, so the list
 * arrives already narrowed and there is nothing here to filter.
 */
export function toPaymentRow(payment: PaymentListItem, names?: NameLookups): PaymentRow {
  return {
    id: payment.id,
    paymentReference: payment.paymentReference,
    loanNumber: payment.loanNumber ?? "—",
    customerName: (payment.customerId ? names?.customers.get(payment.customerId) : undefined) ?? "—",
    branchName: (payment.branchId ? names?.branches.get(payment.branchId) : undefined) ?? "—",
    amount: payment.amount,
    channel: payment.channel,
    status: payment.status,
    receivedAt: payment.receivedAt,
  };
}
