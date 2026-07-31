import { BadgeCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { hqTransactionsNavFor } from "@/features/ledger/nav-items";
import { getHqTransactions } from "@/lib/api/headquarters";
import { getBranches } from "@/lib/api/organization";
import { HqTransactionsPanel } from "@/features/operations/hq-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  const [{ transactions }, branches] = await Promise.all([
    getHqTransactions({ status: "approved" }),
    getBranches(),
  ]);

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
        transactions={transactions}
        decidable={false}
        title="Approved Transactions"
        description="Decided and released, newest first."
        emptyTitle="Nothing approved yet"
        emptyDescription="An approved request moves here from Requested Transactions."
        branches={branches.map((b) => b.name)}
      />
    </>
  );
}
