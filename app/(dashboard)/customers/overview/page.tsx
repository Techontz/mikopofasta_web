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
import { CustomerOverviewPanel } from "@/features/customers/customer-overview-panel";
import { toCustomerListRow } from "@/features/customers/view-models";
import { currentMonth } from "@/lib/domain/current-month";

/**
 * Customer → Overview.
 *
 * Counts the same rows the All Customer tab lists, off the same call, so the
 * two tabs cannot disagree about how many customers there are.
 */
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.CUSTOMERS_VIEW])) return <AccessDeniedState />;

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
        title="Customer"
        description="Who is on the book, how many can transact, and who joined most recently."
        breadcrumb={[{ label: "Customer", href: "/customers" }, { label: "Overview" }]}
      />
      <SectionNav items={customerNavFor(user)} />
      <CustomerOverviewPanel rows={rows} currentMonth={currentMonth()} />
    </>
  );
}
