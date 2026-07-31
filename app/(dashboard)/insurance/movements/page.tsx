import { PiggyBank } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { insuranceNavFor } from "@/features/ledger/nav-items";
import { InsuranceLedgerPanel } from "@/features/legacy-modules/insurance-panels";

/**
 * The sidebar calls this module Insurance; every screen inside it is titled for
 * savings. Both are the legacy system's own words — see the note at the top of
 * insurance-panels.tsx. The breadcrumb follows the screen.
 */
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={PiggyBank}
        title="Deposit & Withdrawal"
        description="Find a customer to pay into or draw down their savings."
        breadcrumb={[
          { label: "Saving Deposit", href: "/insurance/movements" },
          { label: "Search customer" },
        ]}
      />
      <SectionNav items={insuranceNavFor(user)} />
      <InsuranceLedgerPanel />
    </>
  );
}
