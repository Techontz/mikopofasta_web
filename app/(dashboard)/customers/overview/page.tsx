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
import { CustomerOverviewPanel } from "@/features/customers/customer-overview-panel";
import { toCustomerListRow } from "@/features/customers/view-models";
import { currentMonth, withDesignFallback } from "@/lib/legacy/design-mode";
import { DESIGN_ALL_CUSTOMER_ROWS } from "@/lib/legacy/design-fixtures";

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
        title="Customer"
        description="Who is on the book, how many can transact, and who joined most recently."
        breadcrumb={[{ label: "Customer", href: "/customers" }, { label: "Overview" }]}
      />
      <SectionNav items={customerNavFor(user)} />
      {isDesignData && <DesignDataBanner reason={reason} />}
      <CustomerOverviewPanel rows={rows} currentMonth={currentMonth()} />
    </>
  );
}
