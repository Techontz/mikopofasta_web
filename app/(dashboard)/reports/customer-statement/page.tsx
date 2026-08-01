import { FileSearch } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { reportNavFor } from "@/features/ledger/nav-items";
import { getAllCustomers } from "@/lib/api/customers";
import { TellerCustomerPicker } from "@/features/teller/teller-customer-picker";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.REPORTS_VIEW)) return <AccessDeniedState />;

  /*
   * The legacy screen searched a customer and opened their statement. The
   * statement is the teller session — the customer, their loans and every
   * payment received against them — so this reuses the picker that opens it
   * rather than building a second search that lands in the same place.
   *
   * §13 is the API's: the book arrives already narrowed.
   */
  const customers = await getAllCustomers();

  return (
    <>
      <PageHeader
        icon={FileSearch}
        title="Customer statement"
        description="Pick a customer to open their statement — every loan they hold and every payment received."
        breadcrumb={[{ label: "Report", href: "/reports" }, { label: "Customer statement" }]}
      />
      <SectionNav items={reportNavFor(user)} />
      <TellerCustomerPicker customers={customers} />
    </>
  );
}
