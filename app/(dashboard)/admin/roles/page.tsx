import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/session";
import { getRolePermissions, hasPermission } from "@/config/permissions";
import { PERMISSIONS, ROLES, type Role } from "@/types/auth";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { RolesList } from "@/features/admin/roles/roles-list";
import { PermissionMatrix } from "@/features/admin/roles/permission-matrix";

export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canEditMatrix = hasPermission(user, PERMISSIONS.ROLES_MANAGE);

  const rolePermissions = Object.fromEntries(ROLES.map((role) => [role, getRolePermissions(role)])) as Record<Role, string[]>;

  return (
    <Tabs defaultValue="roles">
      <TabsList>
        <TabsTrigger value="roles">Roles</TabsTrigger>
        <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
      </TabsList>
      <TabsContent value="roles" className="mt-4">
        <RolesList users={MOCK_USERS} />
      </TabsContent>
      <TabsContent value="matrix" className="mt-4 space-y-2">
        {!canEditMatrix && <p className="text-sm text-muted-foreground">View-only — only Super Admin can edit the permission matrix.</p>}
        <PermissionMatrix rolePermissions={rolePermissions} canEdit={canEditMatrix} />
      </TabsContent>
    </Tabs>
  );
}
