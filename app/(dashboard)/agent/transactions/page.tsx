import { Receipt } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { agentNavFor } from "@/features/ledger/nav-items";
import { AgentTransactionPanel } from "@/features/legacy-modules/agent-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Receipt}
        title="Record Transaction"
        description="Money an agent has taken in on the branch's behalf, and when it was recorded."
        breadcrumb={[
          { label: "Clientless transaction", href: "/agent/payment-modes" },
          { label: "Record transaction" },
        ]}
      />
      <SectionNav items={agentNavFor(user)} />
      <AgentTransactionPanel />
    </>
  );
}
