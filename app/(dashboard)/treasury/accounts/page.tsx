import { Landmark } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { MOCK_BANK_ACCOUNT_RECORDS } from "@/lib/mock-data/bank";
import { RegisterAccountPanel } from "@/features/bank/register-account-panel";

export default async function RegisterAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Landmark}
        title="Register Account"
        description="The bank accounts the company holds. Registering one here makes it available to every screen that moves money."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Register Account" }]}
      />
      <SectionNav items={treasuryNavFor(user)} />
      <RegisterAccountPanel accounts={MOCK_BANK_ACCOUNT_RECORDS} />
    </>
  );
}
