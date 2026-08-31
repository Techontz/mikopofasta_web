import { Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { getAllUsers } from "@/lib/api/users";
import { getBranches, getRegions, getZones } from "@/lib/api/organization";
import { UsersTable } from "@/features/admin/users/users-table";

/**
 * Settings → User Management.
 *
 * `users.manage` gates the whole screen, because there is nothing to see here
 * without it: the table's every row action is a write. The API enforces the
 * same grant on `GET /users`, so this check only decides whether the refusal
 * renders as a page or as an error.
 *
 * The three lookups fail soft. A user list that would not render because the
 * zone list was unavailable would be a worse screen than one whose Branch
 * column reads "—" — and the branch names are a convenience here, not the
 * record.
 */
export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.USERS_MANAGE)) return <AccessDeniedState />;

  const [users, branches, zones, regions] = await Promise.all([
    getAllUsers(),
    getBranches().catch(() => []),
    getZones().catch(() => []),
    getRegions().catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="User Management"
        description="Staff accounts, role assignment, branch scope, and access status."
        breadcrumb={[{ label: "Administration", href: "/admin" }, { label: "User Management" }]}
      />
      {/*
        Searching, role/status filtering and sorting are the table's, over the
        whole set — the staff book is bounded by headcount, so it is fetched
        once rather than paged. The API pages underneath; getAllUsers walks it.
      */}
      <UsersTable users={users} branches={branches} zones={zones} regions={regions} />
    </div>
  );
}
