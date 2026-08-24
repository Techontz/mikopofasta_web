import { ClipboardCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { customerNavFor } from "@/features/ledger/nav-items";
import { getPendingRegistrations } from "@/lib/api/customers";
import { RegistrationApprovalsTable } from "@/features/customers/registration-approvals-table";

/**
 * Customer → Registration Approval.
 *
 * The manager-approval stage that sits between a finished registration and a
 * loan. It is filed under Customer rather than Loan on purpose: this decides
 * whether a CUSTOMER is sound, which is a separate question from whether a
 * loan is, decided by a separate permission, at a separate moment.
 *
 * `customers.approve` — held by Branch Manager, Admin, Head Office Manager and
 * Super Admin. A Loan Officer registers customers and cannot reach this page;
 * the API refuses them too, and the nav rail does not offer the link.
 *
 * Branch scope is the API's. A Branch Manager sees their own branch's queue.
 */
export default async function RegistrationApprovalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.CUSTOMERS_APPROVE)) return <AccessDeniedState />;

  const registrations = await getPendingRegistrations();

  return (
    <>
      <PageHeader
        icon={ClipboardCheck}
        title="Registration Approval"
        description="Approve a completed registration before the customer can apply for a loan."
        breadcrumb={[
          { label: "Customer", href: "/customers" },
          { label: "Registration Approval" },
        ]}
      />
      <SectionNav items={customerNavFor(user)} />

      <RegistrationApprovalsTable registrations={registrations} currentUserId={user.id} />
    </>
  );
}
