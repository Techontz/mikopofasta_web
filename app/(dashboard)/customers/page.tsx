import { Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getAllCustomers } from "@/lib/api/customers";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { DesignDataBanner } from "@/components/feedback/design-data-banner";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { customerNavFor } from "@/features/ledger/nav-items";
import { AllCustomersPanel } from "@/features/customers/all-customers-panel";
import { toCustomerListRow } from "@/features/customers/view-models";
import { currentMonth, withDesignFallback } from "@/lib/legacy/design-mode";
import { DESIGN_ALL_CUSTOMER_ROWS } from "@/lib/legacy/design-fixtures";

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
  const {
    data: rows,
    isDesignData,
    reason,
  } = await withDesignFallback(
    async () => (await getAllCustomers()).map(toCustomerListRow),
    DESIGN_ALL_CUSTOMER_ROWS
  );

  return (
    <>
      <PageHeader
        icon={Users}
        title="All Customer"
        description="Everyone on the book, with where they are and whether they can borrow."
        breadcrumb={[{ label: "Customer", href: "/customers" }, { label: "All Customer" }]}
      />
      <SectionNav items={customerNavFor(user)} />
      {isDesignData && <DesignDataBanner reason={reason} />}
      <AllCustomersPanel rows={rows} currentMonth={currentMonth()} />
    </>
  );
}
