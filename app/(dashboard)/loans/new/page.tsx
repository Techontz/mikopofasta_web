import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { loanNavFor } from "@/features/ledger/nav-items";
import { getCustomers } from "@/lib/api/customers";
import { LoanApplicantSelector } from "@/features/loans/loan-applicant-selector";

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

  /*
   * COUNTS ONLY. The screen no longer downloads the customer book.
   *
   * It used to call `getAllCustomers({loanEligible:true})`, which pages until
   * it has every eligible customer, purely to fill one dropdown — the whole
   * branch's records shipped to the browser on every visit. The selector now
   * queries `?loan_eligible=1&search=` as the officer types, so all this page
   * needs is the totals that decide the empty state and explain it.
   *
   * `perPage: 1` because only `pagination.total` is wanted. The eligibility
   * rule itself is the API's — `Customer::scopeLoanEligible()` — and is not
   * restated here.
   */
  const [eligible, pendingApproval, awaitingKyc] = await Promise.all([
    getCustomers({ loanEligible: true, perPage: 1, page: 1 }),
    getCustomers({ kycStatus: ["completed"], approvalStatus: ["pending"], perPage: 1, page: 1 }),
    getCustomers({ kycStatus: ["incomplete"], perPage: 1, page: 1 }),
  ]);

  const eligibleCount = eligible.pagination?.total ?? 0;

  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title="Loan Application"
        description="Pick a customer to start a new loan application."
        breadcrumb={[{ label: "Loan", href: "/loans" }, { label: "Loan Application" }]}
      />
      <SectionNav items={loanNavFor(user)} />

      {/* The question this screen exists to answer: which customer. */}
      <LoanApplicantSelector
        eligibleCount={eligibleCount}
        pendingApprovalCount={pendingApproval.pagination?.total ?? 0}
        awaitingKycCount={awaitingKyc.pagination?.total ?? 0}
      />
    </>
  );
}
