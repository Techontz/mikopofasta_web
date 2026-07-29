import { getBranches, getDistricts, getRegions, getStreets, getWards } from "@/lib/api/organization";
import { getCustomerCategories } from "@/lib/api/customers";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { RegistrationWizard } from "@/features/customers/registration-wizard/registration-wizard";

export default async function NewCustomerPage() {
  const user = await getCurrentUser();
  const canPickAnyBranch = user ? hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL) : false;

  // The address cascade filters client-side as the officer picks, so every
  // level is loaded up front. These are the API's own ids: the registration
  // payload is validated against the geography tables, so seeded values from a
  // local array would simply be rejected.
  const [branches, categories, regions, districts, wards, streets] = await Promise.all([
    getBranches(),
    getCustomerCategories(),
    getRegions(),
    getDistricts(),
    getWards(),
    getStreets(),
  ]);

  const activeBranches = branches.filter((b) => b.status === "active" && !b.isHeadOffice);
  const selectableBranches = canPickAnyBranch
    ? activeBranches
    : activeBranches.filter((b) => b.id === user?.branchId);
  const activeCategories = categories.filter((c) => c.deletedAt === null);

  return (
    <div className="space-y-4">
      <div>
        <h1>New Customer Registration</h1>
        <p className="text-sm text-muted-foreground">Complete every step to bring a customer through KYC and make them loan-eligible.</p>
      </div>
      <RegistrationWizard
        branches={selectableBranches}
        branchLocked={!canPickAnyBranch}
        homeBranchId={user?.branchId ?? selectableBranches[0]?.id ?? null}
        categories={activeCategories}
        regions={regions}
        districts={districts}
        wards={wards}
        streets={streets}
      />
    </div>
  );
}
