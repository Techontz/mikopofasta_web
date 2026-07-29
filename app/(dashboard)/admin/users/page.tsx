import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { ZONES } from "@/lib/mock-data/zones";
import { REGIONS } from "@/lib/mock-data/regions";
import { UsersTable } from "@/features/admin/users/users-table";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/settings";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="User Management"
        description="Staff accounts, role assignment, branch scope, and access status."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "User Management" }]}
      />
      <UsersTable users={MOCK_USERS} branches={MOCK_BRANCHES} zones={ZONES} regions={REGIONS} />
    </div>
  );
}
