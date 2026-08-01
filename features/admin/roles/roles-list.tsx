import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/settings";
import { EmptyState } from "@/components/feedback/empty-state";
import { ShieldCheck } from "lucide-react";
import type { RoleRecord } from "@/lib/api/users";

/**
 * Settings → Roles.
 *
 * Every figure is the server's: the label, the description, the grant count and
 * the headcount all come from `GET /roles`, which reads the same
 * RolePermissionMatrix the API authorises against.
 *
 * This used to count users out of a fixture and read the permission count from
 * the frontend's own copy of the matrix. Both were second answers to questions
 * the server already answers, and a second answer can only ever drift.
 */
export function RolesList({ roles }: { roles: RoleRecord[] }) {
  if (roles.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Roles could not be loaded"
        description="The roles endpoint did not answer. Nothing has changed — try again."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map((role) => (
        <Card key={role.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <CardTitle className="text-base">{role.label}</CardTitle>
            <StatusBadge tone="neutral" dot={false}>
              {role.userCount ?? 0} {role.userCount === 1 ? "user" : "users"}
            </StatusBadge>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">{role.description}</p>
            <p className="text-xs font-medium text-muted-foreground">
              {role.permissions.length} permissions granted
              {/* super_admin's grants are fixed, and the matrix says so too. */}
              {!role.editable && " · fixed"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
