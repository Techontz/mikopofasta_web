import { CircleX } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { reportNavFor } from "@/features/ledger/nav-items";
import { LoanQueuePanel } from "@/features/loans/loan-queue-panel";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.REPORTS_VIEW)) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={CircleX}
        title="Write-off Loan"
        description="Loans the business has written off, and what each was carrying when it did."
        breadcrumb={[{ label: "Report", href: "/reports" }, { label: "Write-off" }]}
      />
      <SectionNav items={reportNavFor(user)} />
      <LoanQueuePanel
        filters={{ status: ["written_off"] }}
        canCreate={false}
        emptyKind="closed"
        withBalances={true}
      />
    </>
  );
}
