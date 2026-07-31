import { Landmark } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getBranches } from "@/lib/api/organization";
import { getLedgerAccounts } from "@/lib/api/ledger";
import { getFloatTransfers } from "@/lib/api/capital";
import { PageHeader } from "@/components/settings";
import { FloatTransferForm } from "@/features/capital/float/float-transfer-form";
import { FloatTable } from "@/features/capital/float/float-table";

export default async function FloatAccountsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  const [branches, accounts, { transfers, total }] = await Promise.all([
    getBranches().catch(() => []),
    getLedgerAccounts().catch(() => []),
    getFloatTransfers({ kind: "account_to_account" }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Landmark}
        title="Float Ac-Ac"
        description="Move float between two accounts. Applies immediately."
        breadcrumb={[
          { label: "Capital", href: "/capital/shareholders" },
          { label: "Transifor Float From Acount - Acount" },
        ]}
      />

      <FloatTransferForm
        kind="account_to_account"
        title="Transifor Float From Ac-Ac"
        description="Both sides are the company's own accounts, so this only changes where the cash sits."
        submitLabel="Transfer"
        branches={branches.filter((b) => b.deletedAt === null).map((b) => ({ id: b.id, name: b.name }))}
        accounts={accounts
          .filter((a) => a.deletedAt === null && a.status === "active")
          .map((a) => ({ id: a.id, name: `${a.code} — ${a.name}` }))}
      />

      <div className="space-y-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--st-ink)]">Transaction List</h2>
        <FloatTable transfers={transfers} variant="branch" currentUserId={user.id} total={total} />
      </div>
    </div>
  );
}
