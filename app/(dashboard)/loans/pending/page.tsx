import { Clock } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { loanNavFor } from "@/features/ledger/nav-items";
import { LoanPendingPanel } from "@/features/legacy-loans/loan-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.LOANS_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Clock}
        title="Loan Pending Approve"
        description="Applications waiting on a decision, with the branch and the customer behind each."
        breadcrumb={[{ label: "Loan", href: "/loans" }, { label: "Loan Pending" }]}
      />
      <SectionNav items={loanNavFor(user)} />
      <LoanPendingPanel />
    </>
  );
}
