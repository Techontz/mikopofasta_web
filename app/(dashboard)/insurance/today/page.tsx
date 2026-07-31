import { ArrowDownLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { insuranceNavFor } from "@/features/ledger/nav-items";
import { InsuranceTodayPanel } from "@/features/legacy-modules/insurance-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={ArrowDownLeft}
        title="Today saving Deposit"
        description="What has been paid into savings today, by branch and by customer."
        breadcrumb={[{ label: "saving deposit", href: "/insurance/movements" }]}
      />
      <SectionNav items={insuranceNavFor(user)} />
      <InsuranceTodayPanel />
    </>
  );
}
