import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { loanNavFor } from "@/features/ledger/nav-items";
import { LoanApplicationPanel } from "@/features/legacy-loans/loan-application-panel";

/**
 * Loan → Loan Application.
 *
 * The legacy module opens on a customer search, not on the form, so this route
 * is that search. The wired application form it used to hold is at
 * /loans/new/apply, unchanged — this screen leads into it.
 */
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.LOANS_CREATE)) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title="Loan Application"
        description="Pick a customer to start a new loan application."
        breadcrumb={[{ label: "Loan", href: "/loans" }, { label: "Loan Application" }]}
      />
      <SectionNav items={loanNavFor(user)} />
      <LoanApplicationPanel />
    </>
  );
}
