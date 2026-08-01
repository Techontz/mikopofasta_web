import { UserSearch } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { customerNavFor } from "@/features/ledger/nav-items";
import { getAllCustomers } from "@/lib/api/customers";
import { CustomerSearchPanel } from "@/features/customers/profile/customer-search-panel";

/**
 * Customer → Customer Profile.
 *
 * The legacy module opens on a search: look somebody up, and their profile
 * follows. That first step is what this is, and it is the real customer book
 * now rather than three transcribed fixtures.
 *
 * Each row goes to `/customers/{id}`, the profile this app already had. There
 * is no second profile screen: two views of one customer would drift, and the
 * live one carries nine tabs — KYC, documents, notes, guarantors, next of kin,
 * group, timeline and the audit trail — that a rebuilt copy would not.
 */
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.CUSTOMERS_VIEW])) return <AccessDeniedState />;

  // §13 is the API's — already narrowed to the branches this user may see.
  const customers = await getAllCustomers();

  return (
    <>
      <PageHeader
        icon={UserSearch}
        title="Search customer"
        description="Look a customer up to see what the system holds on them."
        breadcrumb={[{ label: "Customer", href: "/customers" }, { label: "Customer Profile" }]}
      />
      <SectionNav items={customerNavFor(user)} />
      <CustomerSearchPanel customers={customers} />
    </>
  );
}
