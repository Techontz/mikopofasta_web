import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { ApiError } from "@/lib/api/errors";
import { getRoles, getUser } from "@/lib/api/users";
import { getBranches, getRegions, getZones } from "@/lib/api/organization";
import { getAllStaff } from "@/lib/api/hr";
import { PERMISSIONS } from "@/types/auth";
import { ROLE_LABELS, hasPermission } from "@/config/permissions";
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

/**
 * Settings → User Management → one account.
 *
 * `users.manage` gates it, matching the list it is reached from and the API's
 * own grant on `GET /users/{id}`.
 */
export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  if (!hasPermission(viewer, PERMISSIONS.USERS_MANAGE)) return <AccessDeniedState />;

  let user;
  try {
    user = await getUser(id);
  } catch (error) {
    // A 404 is a route that should not exist; anything else is a real failure
    // and is left to the error boundary rather than dressed up as "not found".
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  /*
   * The lookups fail soft, and the staff book is one of them: this screen is
   * about the ACCOUNT, and an employee number that cannot be resolved should
   * read "—" rather than take the page down.
   */
  const [branches, zones, regions, staff, roles] = await Promise.all([
    getBranches().catch(() => []),
    getZones().catch(() => []),
    getRegions().catch(() => []),
    getAllStaff().catch(() => []),
    getRoles().catch(() => []),
  ]);

  const branch = branches.find((b) => b.id === user.branchId);
  const zone = zones.find((z) => z.id === user.zoneId);
  const region = regions.find((r) => r.id === user.regionId);
  const staffProfile = staff.find((s) => s.userId === user.id);

  /*
   * The role's grants as the SERVER holds them, not the frontend's copy of the
   * matrix. The two are meant to agree, and reading the server's is how a
   * divergence becomes visible here rather than staying hidden.
   *
   * Per-user grants beyond the role are deliberately not shown: `GET /users`
   * does not expose them, and rendering an empty "extra grants" block would
   * assert there are none, which this screen cannot know.
   */
  const permissions = roles.find((r) => r.name === user.role)?.permissions ?? [];

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
            <UserFormDialog user={user} branches={branches} zones={zones} regions={regions} />
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
              <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
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
          title="Role permissions"
          description={
            permissions.length > 0
              ? `${permissions.length} granted by the ${ROLE_LABELS[user.role]} role, as the server holds them.`
              : "Role grants could not be read."
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {permissions.map((p) => (
              <StatusBadge key={p} tone="neutral" dot={false} className="font-mono">
                {p}
              </StatusBadge>
            ))}
          </div>

          <SectionDivider label="Grants beyond the role" className="my-4" />
          <p className="text-[12.5px] text-[var(--st-ink-soft)]">
            Per-user grants are not listed here: the users endpoint does not carry them, and an
            empty list would assert there are none.
          </p>
        </SettingsCard>
      </div>
    </div>
  );
}

/** Two letters of a name — a rendering choice, so it is derived, not stored. */
function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[12px] text-[var(--st-ink-faint)]">{label}</dt>
      <dd className="text-[13.5px] font-medium text-[var(--st-ink)]">{children}</dd>
    </div>
  );
}
