import { Building2, Bell, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { getCurrentUser } from "@/lib/auth/session";
import { getBranches } from "@/lib/api/branches";
import { getNotifications } from "@/lib/api/notifications";
import { getEffectivePermissions, ROLE_LABELS } from "@/config/permissions";

export default async function DashboardPage() {
  const [user, branches, notifications] = await Promise.all([
    getCurrentUser(),
    getBranches(),
    getNotifications(),
  ]);

  const permissionCount = user ? getEffectivePermissions(user).length : 0;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const tiles = [
    { label: "Branches", value: branches.length, icon: Building2 },
    { label: "Your Role", value: user ? ROLE_LABELS[user.role] : "—", icon: ShieldCheck },
    { label: "Permissions Granted", value: permissionCount, icon: Users },
    { label: "Unread Notifications", value: unreadCount, icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1>Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-muted-foreground">
          This is the foundation shell — business modules land in their own implementation phases.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tile.label}</CardTitle>
              <tile.icon className="size-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="font-tabular text-2xl font-semibold">{tile.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No business activity yet"
            description="Customer, loan, and repayment activity will appear here once those modules are built."
          />
        </CardContent>
      </Card>
    </div>
  );
}
