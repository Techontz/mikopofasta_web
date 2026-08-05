import { customerFullName } from "@/types/customer";
import type { CustomerListItem } from "@/lib/api/customers";
import type { CustomerListRow } from "@/features/customers/all-customers-panel";

/**
 * Whole years elapsed, in the operator's timezone.
 *
 * Derived rather than stored, and derived on the server: the legacy screen
 * prints an Age column beside the date of birth, and two columns that can
 * disagree about the same person is the kind of thing nobody notices until it
 * matters.
 */
function ageFrom(dob: string | null): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
}

/** The row shape the All Customer grid draws. */
export function toCustomerListRow(customer: CustomerListItem): CustomerListRow {
  return {
    id: customer.id,
    customerId: customer.customerNumber,
    name: customer.fullName || customerFullName(customer),
    dob: customer.dob,
    age: ageFrom(customer.dob),
    gender: customer.gender,
    phone: customer.phone,
    branch: customer.branchName ?? "—",
    /* The signed photo URL, for the row's avatar. Null on most customers —
       see CustomerAvatar, where initials are the ordinary case. */
    photoUrl: customer.photoPath,
    /*
     * Carried so the list's search box can match them. This page filters in
     * the browser over every customer it loaded, so a field the row does not
     * hold is a field the officer cannot search — however wide the API's own
     * search became.
     */
    email: customer.email ?? null,
    nationalId: customer.nationalIdNumber ?? null,
    tin: customer.tinNumber ?? null,
    passport: customer.passportNumber ?? null,
    accountNumber: customer.accountNumber ?? null,
    walletNumber: customer.walletNumber ?? null,
    businessName: customer.businessName ?? null,
    occupation: customer.occupation ?? null,
    status: customer.status,
    createdAt: customer.createdAt,
  };
}
