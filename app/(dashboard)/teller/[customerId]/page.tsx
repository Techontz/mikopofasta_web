import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { ApiError } from "@/lib/api/errors";
import { getCustomer } from "@/lib/api/customers";
import { getAllLoans } from "@/lib/api/loans";
import { getAllPayments } from "@/lib/api/payments";
import { customerFullName } from "@/types/customer";
import { TellerSessionView } from "@/features/teller/teller-session-view";

/**
 * Teller → Customer Loan Information.
 *
 * Where picking somebody on the Teller Dashboard lands. The customer id is the
 * URL segment, so a session is linkable and a reload comes back to the same
 * customer.
 *
 * The loans are fetched per customer rather than filtered out of the whole
 * book: `GET /loans?customer_id=` is one request either way, and asking for
 * everything to discard most of it gets slower as the book grows.
 */
export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  const { customerId } = await params;

  let customer;
  try {
    customer = await getCustomer(customerId);
  } catch (error) {
    // A 404 is a link to somebody who is not there; anything else is a real
    // failure and belongs to the error boundary rather than dressed up as one.
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  /*
   * One request each, concurrently, whatever the customer's history.
   *
   * The statement used to be assembled per loan — `GET /payments` took a loan
   * and not a customer, because a payment is received against a loan — so a
   * customer on their eighth loan cost eight requests to render one list. The
   * index now accepts `customer_id` and resolves it through the loan, which is
   * the same join done once on the database rather than N times over HTTP.
   */
  const [loans, payments] = await Promise.all([
    getAllLoans({ customerId }),
    getAllPayments({ customerId }),
  ]);

  const fullName = customerFullName(customer);

  return (
    <>
      <PageHeader
        icon={Wallet}
        title="Customer Loan Information"
        description={`${fullName} · ${customer.customerNumber}`}
        breadcrumb={[{ label: "Teller", href: "/teller" }, { label: "Customer Loan Information" }]}
        actions={
          <Link href="/teller" className="st-btn st-btn-secondary">
            <ArrowLeft className="size-4" strokeWidth={1.9} aria-hidden />
            Back to Teller
          </Link>
        }
      />
      <TellerSessionView customer={customer} loans={loans} payments={payments} />
    </>
  );
}
