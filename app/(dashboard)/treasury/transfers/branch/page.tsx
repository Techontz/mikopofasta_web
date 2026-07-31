import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { getBankAccounts, getBankTransfers } from "@/lib/api/bank";
import { getBranches } from "@/lib/api/organization";
import { TransferPanel } from "@/features/bank/transfer-panel";

export default async function TransferBranchPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  const [{ accounts }, { transfers }, branches] = await Promise.all([
    getBankAccounts({ status: "active" }),
    getBankTransfers({ kind: "branch" }),
    getBranches(),
  ]);

  /*
   * Only an active account can fund a transfer — the backend refuses an
   * inactive one anyway, and offering it here would be inviting a rejection.
   * The balance travels with each option so the form can warn before the
   * server has to.
   */
  const sources = accounts.map((a) => ({
    value: a.id,
    label: `${a.bankName} — ${a.accountName}`,
    balance: a.balance,
  }));

  return (
    <>
      <PageHeader
        icon={Building2}
        title="Transfer Balance / Branch Account"
        description="Move funds from a company bank account to a branch. The branch sees it as float it can draw on."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Transfer Balance / Branch Account" }]}
      />
      <SectionNav items={treasuryNavFor(user)} />
      <TransferPanel
        kind="branch"
        transfers={transfers}
        sources={sources}
        // The value is the branch id: a branch transfer names a branch, and the
        // backend resolves its teller cash account from it.
        destinations={branches.map((b) => ({ value: b.id, label: b.name }))}
        destinationLabel="Transfer To"
        destinationColumnLabel="To Branch"
        formTitle="Transfer to Branch Account"
        formDescription="The amount leaves the bank account and reaches the branch till immediately; any bank charge is posted alongside it."
        historyTitle="Transfer History"
      />
    </>
  );
}
