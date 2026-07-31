import { Scale } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { hqTransactionsNavFor } from "@/features/ledger/nav-items";
import { MOCK_HQ_TRANSACTIONS } from "@/lib/mock-data/operations";
import { LEGACY_HQ_ACCOUNTS } from "@/lib/legacy/source";
import { HqAccountBalanceTable, HqBalancePanel } from "@/features/operations/hq-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Scale}
        title="Headquarters Account Balance"
        description="The head-office position, the movement that produced it, and the latest entries."
        breadcrumb={[{ label: "Headquarters Transaction", href: "/hq/transactions/balance" }, { label: "Headquarters Account Balance" }]}
      />
      <SectionNav items={hqTransactionsNavFor(user)} />

      {/*
        The legacy screen, first and unmodified: the seven headquarters accounts
        and their balances. This is the part of the page that has to match the
        old system exactly, so it leads.

        The panel below it — position, movement, recent entries — is ours. It is
        built on placeholder transactions, because both legacy Headquater
        Transaction screens were captured with no rows in them and so the real
        movement history is unknown.
      */}
      <HqAccountBalanceTable accounts={LEGACY_HQ_ACCOUNTS} />
      <HqBalancePanel transactions={MOCK_HQ_TRANSACTIONS} />
    </>
  );
}
