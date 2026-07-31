import { UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { getBranches, getDistricts, getRegions, getStreets, getWards } from "@/lib/api/organization";
import { getCustomerCategories } from "@/lib/api/customers";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { DesignDataBanner } from "@/components/feedback/design-data-banner";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { customerNavFor } from "@/features/ledger/nav-items";
import { RegistrationWizard } from "@/features/customers/registration-wizard/registration-wizard";
import { withDesignFallback } from "@/lib/legacy/design-mode";
import { DESIGN_REGISTRATION_LOOKUPS } from "@/lib/legacy/design-fixtures";

/**
 * Customer → Register Customer.
 *
 * Six API calls fed this wizard's dropdowns, awaited with no catch, so a
 * stopped API took the route down with an unhandled "Unauthenticated." — the
 * crash reported at `NewCustomerPage`. They are now loaded together behind
 * withDesignFallback.
 *
 * All six fall back together rather than one at a time. A form showing live
 * branches beside fixture regions would be lying in a way that is very hard to
 * spot, and the banner could not be worded truthfully either way.
 */
export default async function NewCustomerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.CUSTOMERS_MANAGE])) return <AccessDeniedState />;

  const canPickAnyBranch = hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL);

  // The address cascade filters client-side as the officer picks, so every
  // level is loaded up front.
  const { data, isDesignData, reason } = await withDesignFallback(
    async () =>
      Promise.all([
        getBranches(),
        getCustomerCategories(),
        getRegions(),
        getDistricts(),
        getWards(),
        getStreets(),
      ]),
    DESIGN_REGISTRATION_LOOKUPS
  );

  const [branches, categories, regions, districts, wards, streets] = data;

  const activeBranches = branches.filter((b) => b.status === "active" && !b.isHeadOffice);

  /*
   * Branch scoping is skipped in design mode. The fixture branches carry
   * fixture ids, which never match the signed-in user's real branch id, so
   * filtering to it would empty the Branch dropdown — the exact fault this
   * whole pass is fixing.
   */
  const selectableBranches =
    canPickAnyBranch || isDesignData
      ? activeBranches
      : activeBranches.filter((b) => b.id === user.branchId);

  const activeCategories = categories.filter((c) => c.deletedAt === null);

  return (
    <>
      <PageHeader
        icon={UserPlus}
        title="Register Customer"
        description="Bring a customer through KYC in three steps and make them loan-eligible."
        breadcrumb={[
          { label: "Customer", href: "/customers" },
          { label: "Customer Registration Form" },
        ]}
      />
      <SectionNav items={customerNavFor(user)} />

      {isDesignData && <DesignDataBanner reason={reason} />}

      <RegistrationWizard
        branches={selectableBranches}
        branchLocked={!canPickAnyBranch && !isDesignData}
        homeBranchId={user.branchId ?? selectableBranches[0]?.id ?? null}
        categories={activeCategories}
        regions={regions}
        districts={districts}
        wards={wards}
        streets={streets}
      />
    </>
  );
}
