import { Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { getAllCustomers } from "@/lib/api/customers";
import { TellerCustomerPicker } from "@/features/teller/teller-customer-picker";

/**
 * Teller → Teller Dashboard.
 *
 * A single destination with no children, exactly as the legacy sidebar draws
 * it, so no section rail.
 */
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW, PERMISSIONS.REPAYMENTS_CASH_ENTRY]))
    return <AccessDeniedState />;

  // §13 is the API's — the book arrives already narrowed to this teller's branch.
  const customers = await getAllCustomers();

  return (
    <>
      <PageHeader
        icon={Wallet}
        title="Teller Dashboard"
        description="Find a customer to open a teller session against their account."
        breadcrumb={[{ label: "Teller" }, { label: "Teller Dashboard" }]}
      />
      <TellerCustomerPicker customers={customers} />
    </>
  );
}
