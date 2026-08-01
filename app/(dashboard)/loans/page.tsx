import Link from "next/link";
import { Landmark, List } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { loanNavFor } from "@/features/ledger/nav-items";
import { LoanOverviewPanel } from "@/features/loans/loan-overview-panel";

/**
 * Loan → Overview.
 *
 * The module's front page. The live, API-backed loan book that used to sit on
 * this route is at /loans/book, unchanged, and linked from the header — it is
 * the servicing screen, where this one is the module's position at a glance.
 */
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.LOANS_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Landmark}
        title="Loan"
        description="Where the loan book stands: what has been applied for, what is waiting on a decision, and what has gone out."
        breadcrumb={[{ label: "Loan", href: "/loans" }, { label: "Overview" }]}
        actions={
          <Link href="/loans/book" className="st-btn st-btn-secondary">
            <List className="size-4" strokeWidth={1.9} aria-hidden />
            Full loan book
          </Link>
        }
      />
      <SectionNav items={loanNavFor(user)} />
      <LoanOverviewPanel />
    </>
  );
}
