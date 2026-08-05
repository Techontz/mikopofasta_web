import Link from "next/link";
import { ArrowRight, Building2, Layers, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationStructure } from "@/lib/api/organization-structure";
import { ADMIN_SECTIONS, isSectionVisible } from "@/config/admin-sections";

/**
 * The Super Admin console.
 *
 *     SUPER ADMIN → HEAD OFFICE → ZONES → BRANCHES
 *
 * A governance surface over the modules that already exist, not a second copy
 * of them. Every configuration action it offers links to the module that owns
 * it — rebuilding Products or Roles behind a second set of screens would be two
 * places to change one thing, free to disagree.
 *
 * What is genuinely new here is the thing no existing screen showed: the shape
 * of the institution, who staffs each tier, and which branches nobody
 * supervises.
 */
export default async function OrganizationStructurePage() {
  const user = await getCurrentUser();
  if (!user) return <AccessDeniedState />;

  // The grant that already governs changing the organisation. Reading its whole
  // shape is the same kind of act.
  if (!hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS)) return <AccessDeniedState />;

  const structure = await getOrganizationStructure();
  const governance = ADMIN_SECTIONS.filter((section) => isSectionVisible(user, section) && section.href);

  const staffed = structure.staffByRole.filter((r) => r.count > 0);
  const unstaffed = structure.staffByRole.filter((r) => r.count === 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Layers}
        title="Organization Structure"
        description="Super Admin → Head Office → Zones → Branches, and who staffs each tier."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Organization Structure" }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {structure.tiers
          .filter((tier) => tier.value !== "system")
          .map((tier) => (
            <Card key={tier.value}>
              <CardContent className="space-y-1 pt-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{tier.label}</p>
                  {tier.isOperational && <Badge variant="outline">Operational</Badge>}
                </div>
                <p className="font-tabular text-2xl font-semibold">
                  {structure.staffByTier[tier.value] ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">{tier.scope}</p>
              </CardContent>
            </Card>
          ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4" aria-hidden />
            Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {structure.headOffice ? (
            <div className="rounded-lg border px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{structure.headOffice.name}</span>
                <Badge>Head Office</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                The operational centre — its own manager, loan officers, tellers, credit officers, accountant,
                cashier, recovery officer, customer care, HR and auditor.
              </p>
            </div>
          ) : (
            <EmptyState
              title="No Head Office is set"
              description="Every institution needs one. Set it from Settings → Branch, or the centre has no office to report to."
            />
          )}

          {structure.zones.length === 0 ? (
            <EmptyState title="No zones yet" description="Zones supervise several branches each." />
          ) : (
            <div className="space-y-3">
              {structure.zones.map((zone) => (
                <div key={zone.id} className="rounded-lg border px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{zone.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {zone.branchCount} branch{zone.branchCount === 1 ? "" : "es"}
                    </span>
                  </div>
                  {zone.branches.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {zone.branches.map((branch) => (
                        <li key={branch.id}>
                          <Badge variant="outline">{branch.name}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/*
            Stated rather than hidden. A branch in no zone falls outside every
            Zone Manager's scope, so nobody supervises it — which is almost
            always an oversight rather than a decision.
          */}
          {structure.unzonedBranches.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                {structure.unzonedBranches.length} branch
                {structure.unzonedBranches.length === 1 ? "" : "es"} belong to no zone
              </p>
              <p className="mt-1 text-muted-foreground">
                No Zone Manager supervises {structure.unzonedBranches.length === 1 ? "it" : "them"}.
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {structure.unzonedBranches.map((branch) => (
                  <li key={branch.id}>
                    <Badge variant="outline">{branch.name}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" aria-hidden />
            Staffing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {staffed.map((role) => (
              <Badge key={role.role} variant="outline">
                {role.label} · {role.count}
              </Badge>
            ))}
          </div>

          {/*
            The zeroes matter. An institution with no Recovery Officer should
            see that said, not have the row quietly missing.
          */}
          {unstaffed.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Not yet filled: {unstaffed.map((r) => r.label).join(", ")}.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Governance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {governance.map((section) => (
              <Link
                key={section.title}
                href={section.href as string}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent"
              >
                <span>{section.title}</span>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
