import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { loanNavFor } from "@/features/ledger/nav-items";
import { getAllCustomers } from "@/lib/api/customers";
import { LoanApplicantSelector } from "@/features/loans/loan-applicant-selector";
import { LoanApplicantPicker } from "@/features/loans/loan-applicant-picker";

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
   * Only customers who can actually borrow — and the rule is the API's.
   *
   * This used to send `kycStatus: completed` + `approvalStatus: approved`,
   * which was a hand-assembled copy of `Customer::isLoanEligible()`. One flag
   * now asks the server to apply its own definition, so the selector and the
   * loan gate cannot disagree about who may borrow. Branch scoping is the
   * API's too — the list arrives already narrowed.
   *
   * The two counts beside it are what makes an empty selector explainable
   * rather than merely empty: they say which stage the branch's customers are
   * actually stuck at, and who can move them.
   */
  const [customers, pendingApproval, awaitingKyc] = await Promise.all([
    getAllCustomers({ loanEligible: true }),
    getAllCustomers({ kycStatus: ["completed"], approvalStatus: ["pending"] }),
    getAllCustomers({ kycStatus: ["incomplete"] }),
  ]);

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
        customers={customers}
        pendingApprovalCount={pendingApproval.length}
        awaitingKycCount={awaitingKyc.length}
      />

      {/* And the book underneath, for when browsing is what you actually want.
          Same list, same eligibility — one source, two ways in. */}
      {customers.length > 0 && <LoanApplicantPicker customers={customers} />}
    </>
  );
}
