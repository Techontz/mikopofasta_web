import { redirect } from "next/navigation";
import { Info, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS, type Role } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getRoles } from "@/lib/api/users";
import { RolesList } from "@/features/admin/roles/roles-list";
import { PermissionMatrix } from "@/features/admin/roles/permission-matrix";
import { PageHeader } from "@/components/settings";

/**
 * Settings → Roles & Permissions.
 *
 * `roles.view` reads the matrix, `roles.manage` edits it — RolePolicy's split,
 * and the API enforces the same two grants.
 *
 * Both the role cards and the matrix now come from `GET /roles`, which reads
 * the grants the API actually authorises against. The frontend's own
 * `ROLE_PERMISSIONS` map is still used for gating THIS session's UI, but it is
 * no longer the source of what the matrix displays: showing a copy would hide
 * the moment the two disagree, which is exactly when somebody needs to know.
 */
export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.ROLES_VIEW)) return <AccessDeniedState />;

  const canEditMatrix = hasPermission(user, PERMISSIONS.ROLES_MANAGE);

  const roles = await getRoles();

  const rolePermissions = Object.fromEntries(
    roles.map((role) => [role.name, role.permissions])
  ) as Record<Role, string[]>;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheck}
        title="Roles & Permissions"
        description="Role definitions and the system-wide permission matrix every screen and route is gated by."
        breadcrumb={[{ label: "Administration", href: "/admin" }, { label: "Roles & Permissions" }]}
      />

      <Tabs defaultValue="roles" className="gap-5">
        <TabsList variant="line" className="h-auto gap-1 p-0">
          <TabsTrigger value="roles" className="st-rail-item h-auto">Roles</TabsTrigger>
          <TabsTrigger value="matrix" className="st-rail-item h-auto">Permission Matrix</TabsTrigger>
        </TabsList>
        <TabsContent value="roles">
          <RolesList roles={roles} />
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
