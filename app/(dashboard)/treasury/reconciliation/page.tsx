import { Landmark, Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader, SettingsCard, StatCard } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { formatMoney } from "@/lib/domain/money";
import { getCashDeposits, getUnbankedPayments } from "@/lib/api/accounting";
import { getBankAccounts } from "@/lib/api/bank";
import { CashDepositDialog, CashDepositTable } from "@/features/accounting/reconciliation-panel";

/**
 * Bank reconciliation — §15.3, and the gap that made `confirmed` unreachable.
 *
 * Two roles on one screen, which is deliberate: a teller sees what they have
 * banked and what is still in the till, and Finance sees the same queue with
 * the confirm action enabled. Splitting them would hide the consequence of each
 * from the other.
 */
export default async function ReconciliationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.REPAYMENTS_VIEW)) return <AccessDeniedState />;

  const canBank = hasPermission(user, PERMISSIONS.REPAYMENTS_CASH_ENTRY);
  const canReconcile = hasPermission(user, PERMISSIONS.REPAYMENTS_RECONCILE);

  /*
   * All three read live. The unbanked list is what the deposit form offers, so
   * a teller never types a payment id — the reconciliation refuses a mismatch
   * outright, and typing is how mismatches start.
   */
  const [queue, unbanked, bank] = await Promise.all([
    getCashDeposits().catch(() => ({ deposits: [], total: 0, pendingTotal: 0, pendingCount: 0 })),
    canBank
      ? getUnbankedPayments().catch(() => ({ payments: [], total: 0 }))
      : Promise.resolve({ payments: [], total: 0 }),
    canBank
      ? getBankAccounts({ status: "active" }).catch(() => ({ accounts: [], totalBalance: 0 }))
      : Promise.resolve({ accounts: [], totalBalance: 0 }),
  ]);

  return (
    <>
      <PageHeader
        icon={Landmark}
        title="Bank Reconciliation"
        description="A teller banks the day's cash and names the payments it covers; Finance verifies the total and confirms receipt."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Bank Reconciliation" }]}
        actions={
          canBank ? (
            <CashDepositDialog
              payments={unbanked.payments}
              bankAccounts={bank.accounts.map((a) => ({
                id: a.id,
                label: `${a.bankName} — ${a.accountNumber}`,
              }))}
              branchId={user.branchId ?? null}
            />
          ) : undefined
        }
      />

      <SectionNav items={treasuryNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting verification"
          value={String(queue.pendingCount)}
          hint="Deposits Finance has not confirmed"
          icon={Landmark}
          tone="accent"
        />
        <StatCard label="Pending amount" value={formatMoney(queue.pendingTotal)} icon={Landmark} />
        <StatCard label="Banked to date" value={formatMoney(queue.total)} icon={Landmark} />
        <StatCard
          label="Still in the till"
          value={formatMoney(unbanked.total)}
          hint={canBank ? "Cash taken but not yet banked" : "Visible to a teller"}
          icon={Wallet}
        />
      </div>

      <SettingsCard
        title="Cash Deposits"
        description={
          canReconcile
            ? "Confirming posts Dr Bank · Cr Teller Cash and marks the named payments confirmed. A deposit whose payments do not sum to the amount banked is refused."
            : "Read-only. Confirming a deposit needs the repayments.reconcile permission, which Finance holds."
        }
        bodyClassName="p-0 sm:p-0"
      >
        <CashDepositTable deposits={queue.deposits} canReconcile={canReconcile} />
      </SettingsCard>
    </>
  );
}
