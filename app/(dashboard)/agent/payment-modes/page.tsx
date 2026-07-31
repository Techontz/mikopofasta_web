import { CreditCard } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { agentNavFor } from "@/features/ledger/nav-items";
import { PaymentModePanel } from "@/features/legacy-modules/agent-panels";

/** The old system breadcrumbs this module "Clientless transaction". */
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={CreditCard}
        title="Mode of Payment"
        description="The channels an agent may collect and settle over."
        breadcrumb={[
          { label: "Clientless transaction", href: "/agent/payment-modes" },
          { label: "Mode of payment" },
        ]}
      />
      <SectionNav items={agentNavFor(user)} />
      <PaymentModePanel />
    </>
  );
}
