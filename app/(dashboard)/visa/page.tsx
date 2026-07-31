import { Landmark } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { VisaPanel } from "@/features/legacy-modules/visa-panel";

/**
 * VISA → Bank Account & password.
 *
 * The sidebar entry is VISA; the screen behind it is a bank account list, on
 * which VISA is one column. A single destination with no children, so no
 * section rail.
 */
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Landmark}
        title="Bank Account & password"
        description="Each customer's bank account, and whether a VISA sits against it."
        breadcrumb={[{ label: "Bank Account & password" }]}
      />
      <VisaPanel />
    </>
  );
}
