import { customerFullName, type Customer } from "@/types/customer";
import type { CustomerRow } from "@/features/customers/customers-table";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { MOCK_CUSTOMER_CATEGORIES } from "@/lib/mock-data/customer-categories";

export function toCustomerRow(customer: Customer): CustomerRow {
  const branch = MOCK_BRANCHES.find((b) => b.id === customer.branchId);
  const category = MOCK_CUSTOMER_CATEGORIES.find((c) => c.id === customer.customerCategoryId);
  return {
    id: customer.id,
    customerNumber: customer.customerNumber,
    fullName: customerFullName(customer),
    phone: customer.phone,
    branchName: branch?.name ?? "—",
    categoryName: category?.name ?? "Uncategorized",
    kycStatus: customer.kycStatus,
    status: customer.status,
    approvalStatus: customer.approvalStatus,
    createdAt: customer.createdAt,
  };
}
