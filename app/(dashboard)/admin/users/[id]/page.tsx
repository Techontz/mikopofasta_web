import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { ZONES } from "@/lib/mock-data/zones";
import { REGIONS } from "@/lib/mock-data/regions";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/staff-profiles";
import { ROLE_LABELS, getEffectivePermissions } from "@/config/permissions";
import { UserFormDialog } from "@/features/admin/users/user-form-dialog";
import { UserStatusAction } from "@/features/admin/users/user-status-action";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = MOCK_USERS.find((u) => u.id === id);
  if (!user) notFound();

  const branch = MOCK_BRANCHES.find((b) => b.id === user.branchId);
  const zone = ZONES.find((z) => z.id === user.zoneId);
  const region = REGIONS.find((r) => r.id === user.regionId);
  const staffProfile = MOCK_STAFF_PROFILES.find((s) => s.userId === user.id);
  const permissions = getEffectivePermissions(user);

  return (
    <div className="space-y-4">
      <BreadcrumbLabel label={user.name} />
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/admin/users"><ArrowLeft className="size-4" />Back to Staff List</Link>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">{user.avatarInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{ROLE_LABELS[user.role]}</p>
            </div>
            <Badge variant={user.status === "active" ? "default" : "secondary"} className="capitalize">
              {user.status}
            </Badge>
            <div className="flex w-full gap-2 pt-2">
              <UserFormDialog user={user} branches={MOCK_BRANCHES} zones={ZONES} regions={REGIONS} />
              <UserStatusAction user={user} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone">{user.phone}</Field>
            <Field label="Email">{user.email ?? "—"}</Field>
            <Field label="Home branch">{branch?.name ?? "—"}</Field>
            <Field label="Zone oversight">{zone?.name ?? "—"}</Field>
            <Field label="Region oversight">{region?.name ?? "—"}</Field>
            <Field label="Employee number">{staffProfile?.employeeNumber ?? "—"}</Field>
            <Field label="Last login">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</Field>
            <Field label="Commission eligible">{staffProfile?.commissionEligible ? "Yes" : "No"}</Field>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Effective Permissions ({permissions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {permissions.map((p) => (
                <Badge key={p} variant="outline" className="font-mono text-xs font-normal">
                  {p}
                </Badge>
              ))}
            </div>
            {user.extraPermissions.length > 0 && (
              <>
                <Separator className="my-3" />
                <p className="mb-2 text-xs font-medium text-muted-foreground">Explicit grants beyond the role default</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.extraPermissions.map((p) => (
                    <Badge key={p} className="font-mono text-xs font-normal">
                      {p}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  );
}
