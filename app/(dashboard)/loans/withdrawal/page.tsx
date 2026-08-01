import { ArrowUpRight } from "lucide-react";
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

/** The old system files this one under Report, not Loan. The trail follows it. */
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.LOANS_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={ArrowUpRight}
        title="Loan Withdrawal"
        description="Applications withdrawn before any money moved."
        breadcrumb={[{ label: "Report", href: "/reports" }, { label: "Loan Withdrawal" }]}
      />
      <SectionNav items={loanNavFor(user)} />
      <LoanQueuePanel
        filters={{ status: ["cancelled"] }}
        canCreate={hasPermission(user, PERMISSIONS.LOANS_CREATE)}
        emptyKind="closed"
        withBalances={false}
      />
    </>
  );
}
