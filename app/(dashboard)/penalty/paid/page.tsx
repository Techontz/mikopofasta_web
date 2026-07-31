import { Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { penaltyNavFor } from "@/features/ledger/nav-items";
import { MOCK_PAID_PENALTIES } from "@/lib/mock-data/operations";
import { PaidPenaltyPanel } from "@/features/operations/penalty-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.LOANS_VIEW, PERMISSIONS.REPAYMENTS_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Wallet}
        title="Paid Penalty"
        description="Penalties the customer has settled."
        breadcrumb={[{ label: "Penalty", href: "/penalty/list" }, { label: "Paid Penalty" }]}
      />
      <SectionNav items={penaltyNavFor(user)} />
      <PaidPenaltyPanel payments={MOCK_PAID_PENALTIES} />
    </>
  );
}
