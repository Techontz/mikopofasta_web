import { Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { getBankAccounts } from "@/lib/api/bank";
import { AccountBalancePanel } from "@/features/bank/account-balance-panel";

export default async function AccountBalancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  // The one screen that shows today's movement, so the one that asks for it —
  // it costs a grouped query over the day's journal lines.
  const { accounts } = await getBankAccounts({ withMovement: true });

  return (
    <>
      <PageHeader
        icon={Wallet}
        title="Account Balance"
        description="Where the money is right now — one row per bank account, with today's movement and what remains available."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Account Balance" }]}
      />
      <SectionNav items={treasuryNavFor(user)} />
      <AccountBalancePanel accounts={accounts} />
    </>
  );
}
