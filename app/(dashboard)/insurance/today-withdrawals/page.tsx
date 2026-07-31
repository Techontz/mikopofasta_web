import { ArrowUpRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { insuranceNavFor } from "@/features/ledger/nav-items";
import { InsuranceWithdrawalPanel } from "@/features/legacy-modules/insurance-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={ArrowUpRight}
        title="All Saving withdrawal"
        description="Savings taken out, and savings applied against a borrower's loan."
        breadcrumb={[
          { label: "Saving Deposit", href: "/insurance/movements" },
          { label: "Saving withdrawal" },
        ]}
      />
      <SectionNav items={insuranceNavFor(user)} />
      <InsuranceWithdrawalPanel />
    </>
  );
}
