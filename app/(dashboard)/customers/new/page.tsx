import { UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { getBranches } from "@/lib/api/organization";
import { getUsers } from "@/lib/api/users";
import { getRegistrationLookups } from "@/lib/api/master-data";
import { getCustomerCategories } from "@/lib/api/customers";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { customerNavFor } from "@/features/ledger/nav-items";
import { RegistrationWizard } from "@/features/customers/registration-wizard/registration-wizard";

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
  /*
   * No fallback. These lookups used to fall back to fixture branches and
   * categories when the API was unreachable — which meant the form could be
   * filled in against branches that do not exist. A registration screen is the
   * last place to guess, so a failure reaches the error boundary.
   */
  /*
   * Districts, wards and streets are NOT read here any more.
   *
   * They used to be, in full, so the address step could filter them in the
   * browser — three whole-table reads on every visit to this page, the largest
   * of them the street table. The step now asks for one level at a time as the
   * officer opens each control (see geography-actions.ts), so the page loads
   * three fewer queries and the officer waits for one small list instead of
   * every address in the country.
   *
   * Regions stay: it is a short list, and the review step names the chosen one.
   */
  const [branches, categories, users, lookups] = await Promise.all([
    getBranches(),
    getCustomerCategories(),
    /* The "Employee" dropdown — staff, not customers. Fails soft: a missing
       officer list should leave one dropdown empty, not block registration. */
    getUsers().catch(() => ({ users: [] })),
    getRegistrationLookups(),
  ]);

  const activeBranches = branches.filter((b) => b.status === "active" && !b.isHeadOffice);

  // §13: without cross-branch visibility an officer registers into their own
  // branch and nowhere else.
  const selectableBranches = canPickAnyBranch
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

      <RegistrationWizard
        branches={selectableBranches}
        branchLocked={!canPickAnyBranch}
        homeBranchId={user.branchId ?? selectableBranches[0]?.id ?? null}
        categories={activeCategories}
        employees={users.users.map((u) => ({ id: u.id, name: u.name }))}
        lookups={lookups}
      />
    </>
  );
}
