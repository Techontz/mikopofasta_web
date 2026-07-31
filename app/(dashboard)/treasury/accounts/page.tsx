import { Landmark } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { getBankAccounts } from "@/lib/api/bank";
import { getBranches } from "@/lib/api/organization";
import { RegisterAccountPanel } from "@/features/bank/register-account-panel";

export default async function RegisterAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  const [{ accounts }, branches] = await Promise.all([getBankAccounts(), getBranches()]);

  /*
   * The bank select offers the banks the company already deals with, taken from
   * the accounts themselves rather than a fixed list — a fixed one would
   * eventually be missing whichever bank someone needs next.
   */
  const bankNames = [...new Set(accounts.map((a) => a.bankName))].sort();

  return (
    <>
      <PageHeader
        icon={Landmark}
        title="Register Account"
        description="The bank accounts the company holds. Registering one here makes it available to every screen that moves money."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Register Account" }]}
      />
      <SectionNav items={treasuryNavFor(user)} />
      <RegisterAccountPanel
        accounts={accounts}
        bankNames={bankNames}
        branches={branches.map((b) => b.name)}
      />
    </>
  );
}
