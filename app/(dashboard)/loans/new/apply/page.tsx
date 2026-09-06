import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { getCustomer, getCustomerCategories, getKycStatus, type CustomerListItem } from "@/lib/api/customers";
import { customerFullName } from "@/types/customer";
import { getEligibilityMatrix, getInterestFormulas, getLoanProducts, getRepaymentSchedules } from "@/lib/api/loans";
import { LoanApplicationForm } from "@/features/loans/loan-application-form";

export default async function NewLoanPage({
  searchParams,
}: {
  /* `?customerId=` — the choice made on /loans/new, carried through. */
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.LOANS_CREATE)) {
    return <AccessDeniedState />;
  }

  /*
   * NO CUSTOMER LIST. The form searches for one; it is not handed all of them.
   *
   * This used to call `getAllCustomers({loanEligible:true})` — every eligible
   * customer in the branch, paged until exhausted, to populate a `<Select>`.
   * The form now uses the same server-searched combobox as the previous screen,
   * so the only customer this page fetches is the one that was chosen.
   *
   * ELIGIBILITY IS ASKED, NOT INFERRED. The record is fetched by id, and then
   * `GET /customers/{id}/kyc-status` is asked whether they may borrow —
   * `isLoanEligible` is the backend's own verdict, the same one `POST /loans`
   * acts on. A hand-edited `?customerId=` naming somebody pending approval,
   * mid-KYC or suspended therefore opens the form unselected rather than
   * preselected with a customer the submit would refuse. Both calls fail soft
   * for the same reason: a bad query string should cost the officer a
   * selection, not the whole screen.
   */
  const [preselected, products, schedules, formulas, categories] = await Promise.all([
    /* Nothing below depends on the applicant, so resolving them no longer
       holds up the product, schedule, formula and category reads — it used to
       be its own round-trip in front of theirs. */
    customerId ? resolveApplicant(customerId) : Promise.resolve(null),
    getLoanProducts(),
    getRepaymentSchedules(),
    getInterestFormulas(),
    getCustomerCategories(),
  ]);

  // Which products each category may borrow, and the ceiling that can sit under
  // the product's own maximum. Fetched per category because there is no bulk
  // endpoint, and the form needs it before the officer's first keystroke.
  const eligibility = await getEligibilityMatrix(categories.map((c) => c.id));

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/loans"><ArrowLeft className="size-4" />Back to Loans</Link>} />
      <div>
        <h1>New Loan Application</h1>
        <p className="text-sm text-muted-foreground">
          Eligibility, limits, and the repayment plan all come from the selected product&apos;s configuration.
        </p>
      </div>
      <LoanApplicationForm
        initialCustomer={preselected}
        products={products.filter((p) => p.deletedAt === null)}
        schedules={schedules.filter((s) => s.deletedAt === null)}
        formulas={formulas}
        eligibility={eligibility}
      />
    </div>
  );
}

/**
 * The customer named in `?customerId=`, but only if the API says they may
 * borrow.
 *
 * Deliberately two requests rather than one lookup plus a local rule: the
 * second asks the backend for `isLoanEligible`, so this page holds no copy of
 * the eligibility chain. Returns null on anything unexpected — an unknown id, a
 * customer outside this officer's branch scope (the API answers 403), or one
 * who is simply not eligible.
 */
async function resolveApplicant(customerId: string): Promise<CustomerListItem | null> {
  try {
    const [customer, kyc] = await Promise.all([
      getCustomer(customerId),
      getKycStatus(customerId),
    ]);

    if (!kyc.isLoanEligible) return null;

    return {
      ...customer,
      fullName: customerFullName(customer),
      /* The list endpoint supplies these by eager-loading; the single-customer
         one does not, and the combobox renders them only when present. */
      branchName: null,
      categoryName: null,
    };
  } catch {
    return null;
  }
}
