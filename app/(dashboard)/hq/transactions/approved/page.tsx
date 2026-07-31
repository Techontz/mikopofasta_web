import { BadgeCheck } from "lucide-react";
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
        icon={BadgeCheck}
        title="Approved Transactions"
        description="Transactions head office has approved. This list is the audit trail for money that moved."
        breadcrumb={[{ label: "Headquarters Transaction", href: "/hq/transactions/balance" }, { label: "Approved Transactions" }]}
      />
      <SectionNav items={hqTransactionsNavFor(user)} />
      <HqTransactionsPanel
        transactions={MOCK_HQ_TRANSACTIONS.filter((t) => t.status === "approved")}
        decidable={false}
        title="Approved Transactions"
        description="Decided and released, newest first."
        emptyTitle="Nothing approved yet"
        emptyDescription="An approved request moves here from Requested Transactions."
      />
    </>
  );
}
