import { Banknote } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { loanNavFor } from "@/features/ledger/nav-items";
import { LoanDisbursedPanel } from "@/features/legacy-loans/loan-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.LOANS_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Banknote}
        title="Loan Disbursed"
        description="Money that has gone out, what it will come back as, and on what cadence."
        breadcrumb={[{ label: "Loan", href: "/loans" }, { label: "Loan Disbursed" }]}
      />
      <SectionNav items={loanNavFor(user)} />
      <LoanDisbursedPanel />
    </>
  );
}
