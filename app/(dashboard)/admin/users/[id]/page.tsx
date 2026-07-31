import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { ZONES } from "@/lib/mock-data/zones";
import { REGIONS } from "@/lib/mock-data/regions";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/staff-profiles";
import { ROLE_LABELS, getEffectivePermissions } from "@/config/permissions";
import { UserFormDialog } from "@/features/admin/users/user-form-dialog";
import { UserStatusAction } from "@/features/admin/users/user-status-action";
import { PageHeader, SectionDivider, SettingsCard, StatusBadge } from "@/components/settings";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";

/**
 * Pinned locale and timezone — a bare toLocaleString() renders differently on
 * the server and in the browser, which fails hydration (React #418).
 */
const LAST_LOGIN = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

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
    <div className="space-y-6">
      <BreadcrumbLabel label={user.name} />

      <PageHeader
        icon={UserRound}
        title={user.name}
        description={ROLE_LABELS[user.role]}
        breadcrumb={[
          { label: "Settings", href: "/admin" },
          { label: "User Management", href: "/admin/users" },
          { label: user.name },
        ]}
        actions={
          <>
            <UserFormDialog user={user} branches={MOCK_BRANCHES} zones={ZONES} regions={REGIONS} />
            <UserStatusAction user={user} />
          </>
        }
      />

      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--st-ink-soft)] transition-colors hover:text-[var(--st-ink)]"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to Staff List
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <SettingsCard className="lg:col-span-1" bodyClassName="pt-5 sm:pt-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">{user.avatarInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[15px] font-semibold text-[var(--st-ink)]">{user.name}</p>
              <p className="text-[13px] text-[var(--st-ink-soft)]">{ROLE_LABELS[user.role]}</p>
            </div>
            <StatusBadge tone={user.status === "active" ? "active" : "inactive"} className="capitalize">
              {user.status}
            </StatusBadge>
          </div>
        </SettingsCard>

        <SettingsCard className="lg:col-span-2" title="Details">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Fact label="Phone">{user.phone}</Fact>
            <Fact label="Email">{user.email ?? "—"}</Fact>
            <Fact label="Home branch">{branch?.name ?? "—"}</Fact>
            <Fact label="Zone oversight">{zone?.name ?? "—"}</Fact>
            <Fact label="Region oversight">{region?.name ?? "—"}</Fact>
            <Fact label="Employee number">{staffProfile?.employeeNumber ?? "—"}</Fact>
            <Fact label="Last login">
              {user.lastLoginAt ? LAST_LOGIN.format(new Date(user.lastLoginAt)) : "Never"}
            </Fact>
            <Fact label="Commission eligible">{staffProfile?.commissionEligible ? "Yes" : "No"}</Fact>
          </dl>
        </SettingsCard>

        <SettingsCard
          className="lg:col-span-3"
          title="Effective permissions"
          description={`${permissions.length} granted by this role.`}
        >
          <div className="flex flex-wrap gap-1.5">
            {permissions.map((p) => (
              <StatusBadge key={p} tone="neutral" dot={false} className="font-mono">
                {p}
              </StatusBadge>
            ))}
          </div>

          {user.extraPermissions.length > 0 && (
            <>
              <SectionDivider label="Explicit grants beyond the role default" className="my-4" />
              <div className="flex flex-wrap gap-1.5">
                {user.extraPermissions.map((p) => (
                  <StatusBadge key={p} tone="default" dot={false} className="font-mono">
                    {p}
                  </StatusBadge>
                ))}
              </div>
            </>
          )}
        </SettingsCard>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[12px] text-[var(--st-ink-faint)]">{label}</dt>
      <dd className="text-[13.5px] font-medium text-[var(--st-ink)]">{children}</dd>
    </div>
  );
}
