import { UserSearch } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { customerNavFor } from "@/features/ledger/nav-items";
import { CustomerProfilePanel } from "@/features/legacy-loans/customer-profile-panel";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.CUSTOMERS_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={UserSearch}
        title="Search customer"
        description="Look a customer up by name to see what the system holds on them."
        breadcrumb={[{ label: "Customer", href: "/customers" }, { label: "Customer Profile" }]}
      />
      <SectionNav items={customerNavFor(user)} />
      <CustomerProfilePanel />
    </>
  );
}
