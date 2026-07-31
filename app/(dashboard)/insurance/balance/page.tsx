import { Scale } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { insuranceNavFor } from "@/features/ledger/nav-items";
import { InsuranceBalancePanel } from "@/features/legacy-modules/insurance-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Scale}
        title="Saving Deposit balance"
        description="What each customer holds in savings right now."
        breadcrumb={[
          { label: "saving deposit", href: "/insurance/movements" },
          { label: "saving balance" },
        ]}
      />
      <SectionNav items={insuranceNavFor(user)} />
      <InsuranceBalancePanel />
    </>
  );
}
