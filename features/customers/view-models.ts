import { customerFullName } from "@/types/customer";
import type { CustomerListItem } from "@/lib/api/customers";
import type { CustomerRow } from "@/features/customers/customers-table";

/**
 * The API resolves `branchName` and `categoryName` alongside the ids when it
 * eager-loads them, so the row no longer looks either up against a local array
 * — which is what kept the table honest once branches stopped being mock data.
 */
export function toCustomerRow(customer: CustomerListItem): CustomerRow {
  return {
    id: customer.id,
    customerNumber: customer.customerNumber,
    fullName: customer.fullName || customerFullName(customer),
    phone: customer.phone,
    branchName: customer.branchName ?? "—",
    categoryName: customer.categoryName ?? "Uncategorized",
    kycStatus: customer.kycStatus,
    status: customer.status,
    approvalStatus: customer.approvalStatus,
    createdAt: customer.createdAt,
  };
}
