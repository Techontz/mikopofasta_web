import { Clock } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { loanNavFor } from "@/features/ledger/nav-items";
import { hasPermission } from "@/config/permissions";
import { LoanQueuePanel } from "@/features/loans/loan-queue-panel";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.LOANS_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Clock}
        title="Loan Pending Approve"
        description="Applications waiting on a decision — manager approval, credit review, mandate or disbursement."
        breadcrumb={[{ label: "Loan", href: "/loans" }, { label: "Loan Pending" }]}
      />
      <SectionNav items={loanNavFor(user)} />
      <LoanQueuePanel
        filters={{ stage: "origination" }}
        canCreate={hasPermission(user, PERMISSIONS.LOANS_CREATE)}
        emptyKind="origination"
        withBalances={false}
      />
    </>
  );
}
