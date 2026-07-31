import { Scale } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { hqTransactionsNavFor } from "@/features/ledger/nav-items";
import { getHqAccounts, getHqTransactions } from "@/lib/api/headquarters";
import { HqAccountBalanceTable, HqBalancePanel } from "@/features/operations/hq-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  // Independent of one another, so they are fetched together rather than in
  // sequence.
  const [accounts, { transactions }] = await Promise.all([getHqAccounts(), getHqTransactions()]);

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
        The legacy screen first: the seven headquarters accounts and their
        balances. These come from the API now rather than a transcribed
        constant — an approved movement changes one, and a screen that could
        not show that would be a picture of the past.

        The panel below it — position, movement, recent entries — is ours,
        built on the same transaction book the API summarises.
      */}
      <HqAccountBalanceTable accounts={accounts} />
      <HqBalancePanel transactions={transactions} />
    </>
  );
}
