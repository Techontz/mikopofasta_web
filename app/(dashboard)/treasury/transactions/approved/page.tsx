import { BadgeCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { getBankAccounts, getBankTransactions } from "@/lib/api/bank";
import { getBranches } from "@/lib/api/organization";
import { TransactionsPanel } from "@/features/bank/transactions-panel";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  const [{ transactions }, { accounts }, branches] = await Promise.all([
    getBankTransactions({ status: "approved" }),
    getBankAccounts(),
    getBranches(),
  ]);

  return (
    <>
      <PageHeader
        icon={BadgeCheck}
        title="Approved Transaction"
        description="Transactions that have been approved and posted. This list is the record of money that actually moved."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Approved Transaction" }]}
      />
      <SectionNav items={treasuryNavFor(user)} />
      <TransactionsPanel
        transactions={transactions}
        decidable={false}
        emptyTitle="Nothing approved yet"
        emptyDescription="No bank transaction has been approved and posted. Once one is decided, the movement is recorded here."
        bankNames={[...new Set(accounts.map((a) => a.bankName))].sort()}
        branches={branches.map((b) => b.name)}
      />
    </>
  );
}
