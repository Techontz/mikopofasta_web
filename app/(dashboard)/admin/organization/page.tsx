import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { MOCK_COMPANY_PROFILE } from "@/lib/mock-data/company-profile";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { REGIONS } from "@/lib/mock-data/regions";
import { ZONES } from "@/lib/mock-data/zones";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { CompanyProfileForm } from "@/features/admin/organization/company-profile-form";
import { RegionsTable } from "@/features/admin/organization/regions-table";
import { ZonesTable } from "@/features/admin/organization/zones-table";
import { BranchesTable } from "@/features/admin/organization/branches-table";

export default async function OrganizationSetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canEdit = hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS);

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Company Profile</TabsTrigger>
        <TabsTrigger value="regions">Regions</TabsTrigger>
        <TabsTrigger value="zones">Zones</TabsTrigger>
        <TabsTrigger value="branches">Branches</TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="mt-4">
        <CompanyProfileForm profile={MOCK_COMPANY_PROFILE} branches={MOCK_BRANCHES} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="regions" className="mt-4">
        <RegionsTable regions={REGIONS} branches={MOCK_BRANCHES} />
      </TabsContent>
      <TabsContent value="zones" className="mt-4">
        <ZonesTable zones={ZONES} managers={MOCK_USERS} branches={MOCK_BRANCHES} />
      </TabsContent>
      <TabsContent value="branches" className="mt-4">
        <BranchesTable branches={MOCK_BRANCHES} regions={REGIONS} zones={ZONES} />
      </TabsContent>
    </Tabs>
  );
}
