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
import { getRegistrationLookups } from "@/lib/api/master-data";
import { RegisterAccountPanel } from "@/features/bank/register-account-panel";

export default async function RegisterAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  /*
   * Both reads start together — neither depends on the other, and the
   * lookups call carries every master-data list in ONE request rather than one
   * per dropdown. Branches are no longer fetched here at all: a company money
   * account has no branch.
   */
  const [{ accounts }, lookups] = await Promise.all([getBankAccounts(), getRegistrationLookups()]);

  /*
   * Banks and mobile money providers come from the master data the institution
   * maintains — never from a list in this file. Adding a bank is an
   * administrator's job, not a deploy.
   */
  const banks = lookups.banks.map((b) => ({ id: b.id, name: b.name }));
  const providers = lookups["mobile-money-providers"].map((p) => ({ id: p.id, name: p.name }));

  return (
    <>
      <PageHeader
        icon={Landmark}
        title="Register Account"
        description="Register the company\u2019s bank and mobile money accounts used to receive collections, make disbursements and manage company funds."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Register Account" }]}
      />
      <SectionNav items={treasuryNavFor(user)} />
      <RegisterAccountPanel accounts={accounts} banks={banks} providers={providers} />
    </>
  );
}
