import { Banknote } from "lucide-react";
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
        icon={Banknote}
        title="Loan Disbursed"
        description="Loans with money out, and what each still owes."
        breadcrumb={[{ label: "Loan", href: "/loans" }, { label: "Loan Disbursed" }]}
      />
      <SectionNav items={loanNavFor(user)} />
      <LoanQueuePanel
        filters={{ stage: "open_book" }}
        canCreate={hasPermission(user, PERMISSIONS.LOANS_CREATE)}
        emptyKind="openBook"
        withBalances={true}
      />
    </>
  );
}
