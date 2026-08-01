import { Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { groupNavFor } from "@/features/ledger/nav-items";
import { getAllGroups } from "@/lib/api/groups";
import { GroupListPanel } from "@/features/legacy-loans/group-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.CUSTOMERS_VIEW])) return <AccessDeniedState />;

  /*
   * GroupPolicy gates this on `customers.view` and §13 scopes it, so an officer
   * sees their own branch's groups and a manager sees them all — decided by the
   * API, not narrowed again here.
   */
  const groups = await getAllGroups();

  return (
    <>
      <PageHeader
        icon={Users}
        title="Group List"
        description="Village banking groups, their committee and what their members still owe."
        breadcrumb={[{ label: "Group", href: "/groups" }, { label: "All Groups" }]}
      />
      <SectionNav items={groupNavFor(user)} />
      <GroupListPanel groups={groups} />
    </>
  );
}
