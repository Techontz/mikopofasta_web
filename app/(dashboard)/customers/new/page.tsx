import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { MOCK_CUSTOMER_CATEGORIES } from "@/lib/mock-data/customer-categories";
import { REGIONS } from "@/lib/mock-data/regions";
import { DISTRICTS } from "@/lib/mock-data/districts";
import { WARDS } from "@/lib/mock-data/wards";
import { STREETS } from "@/lib/mock-data/streets";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { RegistrationWizard } from "@/features/customers/registration-wizard/registration-wizard";

export default async function NewCustomerPage() {
  const user = await getCurrentUser();
  const canPickAnyBranch = user ? hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL) : false;
  const activeBranches = MOCK_BRANCHES.filter((b) => b.status === "active" && !b.isHeadOffice);
  const branches = canPickAnyBranch ? activeBranches : activeBranches.filter((b) => b.id === user?.branchId);
  const categories = MOCK_CUSTOMER_CATEGORIES.filter((c) => c.deletedAt === null);

  return (
    <div className="space-y-4">
      <div>
        <h1>New Customer Registration</h1>
        <p className="text-sm text-muted-foreground">Complete every step to bring a customer through KYC and make them loan-eligible.</p>
      </div>
      <RegistrationWizard
        branches={branches}
        branchLocked={!canPickAnyBranch}
        homeBranchId={user?.branchId ?? branches[0]?.id ?? null}
        categories={categories}
        regions={REGIONS}
        districts={DISTRICTS}
        wards={WARDS}
        streets={STREETS}
      />
    </div>
  );
}
