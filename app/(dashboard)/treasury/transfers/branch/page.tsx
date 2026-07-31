import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { BRANCHES, MOCK_BANK_ACCOUNT_RECORDS, MOCK_BANK_TRANSFERS } from "@/lib/mock-data/bank";
import { TransferPanel } from "@/features/bank/transfer-panel";

export default async function TransferBranchPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  // Only an active account can fund a transfer.
  const sources = MOCK_BANK_ACCOUNT_RECORDS.filter((a) => a.status === "active").map((a) => ({
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
        transfers={MOCK_BANK_TRANSFERS.filter((t) => t.kind === "branch")}
        sources={sources}
        destinations={BRANCHES.map((b) => ({ value: b, label: b }))}
        destinationLabel="Transfer To"
        destinationColumnLabel="To Branch"
        formTitle="Transfer to Branch Account"
        formDescription="The amount leaves the bank account immediately and reaches the branch once the bank settles it."
        historyTitle="Transfer History"
      />
    </>
  );
}
