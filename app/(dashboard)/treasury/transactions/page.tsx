import { ArrowLeftRight } from "lucide-react";
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
import { RaiseTransactionForm } from "@/features/bank/raise-transaction-form";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;
  const canManage = hasPermission(user, PERMISSIONS.TREASURY_MANAGE);

  const [{ transactions }, { accounts }, branches] = await Promise.all([
    getBankTransactions(),
    getBankAccounts(),
    getBranches(),
  ]);

  return (
    <>
      <PageHeader
        icon={ArrowLeftRight}
        title="Bank Transaction"
        description="Money requested into or out of a bank account. Each request carries who raised it, so the person deciding is never the person asking."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Bank Transaction" }]}
      />
      <SectionNav items={treasuryNavFor(user)} />
      {/* Raising needs treasury.manage; viewing the queue needs only
          treasury.view, so a read-only role still sees the list without a
          form it may not submit. */}
      {canManage && (
        <RaiseTransactionForm
          accounts={accounts.map((a) => ({
            id: a.id,
            label: `${a.bankName} — ${a.accountNumber}`,
          }))}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        />
      )}
      <TransactionsPanel
        transactions={transactions}
        decidable={true}
        emptyTitle="No bank transactions"
        emptyDescription="Nothing has been requested into or out of a bank account yet. Raised requests appear here for a second person to decide on."
        bankNames={[...new Set(accounts.map((a) => a.bankName))].sort()}
        branches={branches.map((b) => b.name)}
      />
    </>
  );
}
