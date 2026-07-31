import { ArrowLeftRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { hqTransactionsNavFor } from "@/features/ledger/nav-items";
import { MOCK_HQ_TRANSACTIONS } from "@/lib/mock-data/operations";
import { HqTransactionsPanel } from "@/features/operations/hq-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={ArrowLeftRight}
        title="Requested Transactions"
        description="Money branches have asked head office to move, and what was decided."
        breadcrumb={[{ label: "Headquarters Transaction", href: "/hq/transactions/balance" }, { label: "Requested Transactions" }]}
      />
      <SectionNav items={hqTransactionsNavFor(user)} />
      <HqTransactionsPanel
        transactions={MOCK_HQ_TRANSACTIONS}
        decidable
        title="Requested Transactions"
        description="Each request names who raised it, so the person deciding is never the person asking."
        emptyTitle="No transactions requested"
        emptyDescription="A request appears here as soon as a branch raises one."
      />
    </>
  );
}
