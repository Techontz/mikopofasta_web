import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/settings";
import { ROLES } from "@/types/auth";
import { getEffectivePermissions, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/config/permissions";
import type { MockCredential } from "@/lib/mock-data/users";

export function RolesList({ users }: { users: MockCredential[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ROLES.map((role) => {
        const permissionCount = getEffectivePermissions({ role, extraPermissions: [] }).length;
        const userCount = users.filter((u) => u.role === role).length;
        return (
          <Card key={role}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle className="text-base">{ROLE_LABELS[role]}</CardTitle>
              <StatusBadge tone="neutral" dot={false}>{userCount} {userCount === 1 ? "user" : "users"}</StatusBadge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
              <p className="text-xs font-medium text-muted-foreground">{permissionCount} permissions granted</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
