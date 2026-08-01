import { Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getAllCustomers } from "@/lib/api/customers";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { customerNavFor } from "@/features/ledger/nav-items";
import { AllCustomersPanel } from "@/features/customers/all-customers-panel";
import { toCustomerListRow } from "@/features/customers/view-models";
import { currentMonth } from "@/lib/domain/current-month";

/**
 * Customer → All Customer.
 *
 * This page used to `await getAllCustomers()` with no catch, so a stopped API
 * or a stale session took the whole route down with an unhandled
 * "Unauthenticated." The call is now wrapped: a live API is used when there is
 * one, and the design renders off transcribed fixtures when there is not, with
 * a banner saying which.
 */
export default async function CustomersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.CUSTOMERS_VIEW])) return <AccessDeniedState />;

  // §13 branch scoping is the API's, so this page does no filtering of its own.
  /*
   * No fallback. This used to substitute eighteen invented customers when the
   * API could not be reached, behind a banner. The backend is the source of
   * truth now, and a customer book that renders people who do not exist is
   * worse than a page that says it is broken — so a failure here reaches the
   * error boundary.
   */
  const rows = (await getAllCustomers()).map(toCustomerListRow);

  return (
    <>
      <PageHeader
        icon={Users}
        title="All Customer"
        description="Everyone on the book, with where they are and whether they can borrow."
        breadcrumb={[{ label: "Customer", href: "/customers" }, { label: "All Customer" }]}
      />
      <SectionNav items={customerNavFor(user)} />
      <AllCustomersPanel rows={rows} currentMonth={currentMonth()} />
    </>
  );
}
