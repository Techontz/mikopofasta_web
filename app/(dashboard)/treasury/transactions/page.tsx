import { ArrowLeftRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { MOCK_BANK_TRANSACTIONS } from "@/lib/mock-data/bank";
import { TransactionsPanel } from "@/features/bank/transactions-panel";

export default async function BankTransactionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={ArrowLeftRight}
        title="Bank Transaction"
        description="Money requested into or out of a bank account. Each request carries who raised it, so the person deciding is never the person asking."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Bank Transaction" }]}
      />
      <SectionNav items={treasuryNavFor(user)} />
      <TransactionsPanel
        transactions={MOCK_BANK_TRANSACTIONS}
        decidable
        emptyTitle="No transactions yet"
        emptyDescription="A request appears here as soon as a branch raises one."
      />
    </>
  );
}
