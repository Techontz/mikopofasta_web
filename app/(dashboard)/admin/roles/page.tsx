import { redirect } from "next/navigation";
import { Info, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/session";
import { getRolePermissions, hasPermission } from "@/config/permissions";
import { PERMISSIONS, ROLES, type Role } from "@/types/auth";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { RolesList } from "@/features/admin/roles/roles-list";
import { PermissionMatrix } from "@/features/admin/roles/permission-matrix";
import { PageHeader } from "@/components/settings";

export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canEditMatrix = hasPermission(user, PERMISSIONS.ROLES_MANAGE);

  const rolePermissions = Object.fromEntries(ROLES.map((role) => [role, getRolePermissions(role)])) as Record<Role, string[]>;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheck}
        title="Roles & Permissions"
        description="Role definitions and the system-wide permission matrix every screen and route is gated by."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Roles & Permissions" }]}
      />

      <Tabs defaultValue="roles" className="gap-5">
        <TabsList variant="line" className="h-auto gap-1 p-0">
          <TabsTrigger value="roles" className="st-rail-item h-auto">Roles</TabsTrigger>
          <TabsTrigger value="matrix" className="st-rail-item h-auto">Permission Matrix</TabsTrigger>
        </TabsList>
        <TabsContent value="roles">
          <RolesList users={MOCK_USERS} />
        </TabsContent>
        <TabsContent value="matrix" className="space-y-4">
          {/* Stated before the grid, so a read-only visitor knows it up front. */}
          {!canEditMatrix && (
            <div
              className="flex items-start gap-3 rounded-[14px] border px-4 py-3.5"
              style={{ background: "var(--st-subtle)", borderColor: "var(--st-line)" }}
            >
              <Info className="mt-0.5 size-4 shrink-0 text-[var(--st-ink-faint)]" strokeWidth={1.9} aria-hidden />
              <p className="text-[13px] leading-relaxed text-[var(--st-ink-soft)]">
                View-only — only a Super Admin can edit the permission matrix.
              </p>
            </div>
          )}
          <PermissionMatrix rolePermissions={rolePermissions} canEdit={canEditMatrix} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
