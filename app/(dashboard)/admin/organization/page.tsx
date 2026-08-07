import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import {
  getBranchApprovalRoute,
  getBranches,
  getCompanyProfile,
  getRegions,
  getZoneManagerCandidates,
  getZones,
} from "@/lib/api/organization";
import { CompanyProfileForm } from "@/features/admin/organization/company-profile-form";
import { RegionsTable } from "@/features/admin/organization/regions-table";
import { ZonesTable } from "@/features/admin/organization/zones-table";
import { BranchesTable } from "@/features/admin/organization/branches-table";
import { PageHeader } from "@/components/settings";

export default async function OrganizationSetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canEdit = hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS);

  // Fetched together: the four tabs are rendered in one response, so serialising
  // these would add four round-trips to a page that shows them all at once.
  const [profile, branches, regions, zones, managers] = await Promise.all([
    getCompanyProfile(),
    getBranches(),
    getRegions(),
    getZones(),
    getZoneManagerCandidates(),
  ]);

  /*
   * D4 — each branch's approval routing, for the routing dialog.
   *
   * One request per branch, in parallel. Branches are inherently few (this
   * institution has four) and this is the only screen that needs the detail, so
   * widening the shared `GET /branches` lookup — which the branch switcher and
   * the registration wizard also load — would put this weight on every page
   * that merely needs a list of names.
   *
   * Fails soft per branch: routing is one dialog on a page that is mostly about
   * the branches themselves, and a page that refused to load because one route
   * could not be read would be a broken one.
   */
  const routes = Object.fromEntries(
    await Promise.all(
      branches.map(async (branch) => [
        branch.id,
        await getBranchApprovalRoute(branch.id)
          .then((route) => route.stages)
          .catch(() => []),
      ] as const)
    )
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title="Branch"
        description="Branches, and the region and zone hierarchy every record is scoped by."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Branch" }]}
      />

      <Tabs defaultValue="branches" className="gap-5">
        {/* Branches first: it is what this entry has always opened. */}
        <TabsList variant="line" className="h-auto gap-1 p-0">
          <TabsTrigger value="branches" className="st-rail-item h-auto">Branches</TabsTrigger>
          <TabsTrigger value="regions" className="st-rail-item h-auto">Regions</TabsTrigger>
          <TabsTrigger value="zones" className="st-rail-item h-auto">Zones</TabsTrigger>
          <TabsTrigger value="profile" className="st-rail-item h-auto">Company Profile</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <CompanyProfileForm profile={profile} branches={branches} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="regions">
          <RegionsTable regions={regions} branches={branches} />
        </TabsContent>
        <TabsContent value="zones">
          <ZonesTable zones={zones} managers={managers} branches={branches} />
        </TabsContent>
        <TabsContent value="branches">
          <BranchesTable branches={branches} regions={regions} zones={zones} routes={routes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
