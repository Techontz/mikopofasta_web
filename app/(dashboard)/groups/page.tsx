import { Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { groupNavFor } from "@/features/ledger/nav-items";
import { GroupListPanel } from "@/features/legacy-loans/group-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.CUSTOMERS_VIEW])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Users}
        title="Group List"
        description="Village banking groups. The legacy list carries a name and nothing else."
        breadcrumb={[{ label: "Group", href: "/groups" }, { label: "All Groups" }]}
      />
      <SectionNav items={groupNavFor(user)} />
      <GroupListPanel />
    </>
  );
}
