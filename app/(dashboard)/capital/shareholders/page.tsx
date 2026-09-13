import { Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getShareholders } from "@/lib/api/capital";
import { PageHeader } from "@/components/settings";
import { ShareholdersPanel } from "@/features/capital/shareholders/shareholders-panel";

export default async function ShareholdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  /*
   * Register, edit and delete are `treasury.manage` — CapitalPolicy::manage on
   * the API. A read-only treasury role (Admin, Auditor, …) sees the register
   * but is not offered forms the server would refuse.
   */
  const canManage = hasPermission(user, PERMISSIONS.TREASURY_MANAGE);

  const shareholders = await getShareholders();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Share Holder"
        description="The people holding equity in the company."
        breadcrumb={[{ label: "Capital", href: "/capital/shareholders" }, { label: "Share Holder" }]}
      />
      <ShareholdersPanel shareholders={shareholders} canManage={canManage} />
    </div>
  );
}
