import { ArrowUpRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { loanNavFor } from "@/features/ledger/nav-items";
import { LoanWithdrawalPanel } from "@/features/legacy-loans/loan-panels";

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
        description="Report of loan withdrawals, filtered by the period they fall in."
        breadcrumb={[{ label: "Report", href: "/reports" }, { label: "Loan Withdrawal" }]}
      />
      <SectionNav items={loanNavFor(user)} />
      <LoanWithdrawalPanel />
    </>
  );
}
