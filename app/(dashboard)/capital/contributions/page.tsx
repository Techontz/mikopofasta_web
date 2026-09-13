import { Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCapitalContributions, getShareholders } from "@/lib/api/capital";
import { getBankAccounts } from "@/lib/api/bank";
import { PageHeader } from "@/components/settings";
import { ContributionsPanel } from "@/features/capital/contributions/contributions-panel";

export default async function AddCapitalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  const [shareholders, { contributions, totals }, { accounts }] = await Promise.all([
    getShareholders(),
    getCapitalContributions(),
    // Only accounts that may receive money are offered as where capital landed.
    getBankAccounts({ usage: "collection" }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wallet}
        title="Add Capitals"
        description="Capital paid into the company by its shareholders."
        breadcrumb={[{ label: "Capital", href: "/capital/shareholders" }, { label: "Capital" }]}
      />
      <ContributionsPanel
        shareholders={shareholders}
        contributions={contributions}
        totals={totals}
        accounts={accounts.map((a) => ({ id: a.id, label: `${a.bankName} — ${a.accountName} (${a.accountNumber})` }))}
      />
    </div>
  );
}
