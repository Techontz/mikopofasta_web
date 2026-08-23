import { UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { getBranches } from "@/lib/api/organization";
import { getUsers } from "@/lib/api/users";
import { getRegistrationLookups } from "@/lib/api/master-data";
import { getCustomerCategories } from "@/lib/api/customers";
import { getRegistrationDrafts, getRegistrationRequirements } from "@/lib/api/registration";
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
 * Everything the wizard needs is loaded here, in one round of parallel
 * requests, and NOTHING falls back to fixtures. A registration screen showing
 * live branches beside invented loan types would be lying in a way that is
 * very hard to spot, so a failure reaches the error boundary instead.
 *
 * Two of these are new and load-bearing:
 *
 *   requirements  what each account type demands, and whether this deployment
 *                 can perform a NIDA or SMS check at all. The wizard shows and
 *                 requires what these rows say — the same rows the API
 *                 validates against.
 *
 *   drafts        unfinished registrations. Held on the server, so one begun
 *                 at another desk can be finished here.
 *
 * Districts, wards and streets are not read here. The address step asks for
 * districts one region at a time as the officer opens the control (see
 * geography-actions.ts), and ward and street are typed rather than chosen.
 */
export default async function NewCustomerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.CUSTOMERS_MANAGE])) return <AccessDeniedState />;

  const canPickAnyBranch = hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL);
  /*
   * Whether the Employee field is a dropdown or the signed-in user's name.
   * Assigning a customer to another officer moves the portfolio and the
   * commission with them, so it is a supervisory act with its own grant.
   */
  const canAssignOfficer = hasPermission(user, PERMISSIONS.CUSTOMERS_ASSIGN_OFFICER);

  const [branches, categories, users, lookups, requirements, drafts] = await Promise.all([
    getBranches(),
    getCustomerCategories(),
    /* The staff list, needed only when delegation is allowed. Fails soft: a
       missing officer list should leave one dropdown short, not block
       registration. */
    canAssignOfficer ? getUsers().catch(() => ({ users: [] })) : Promise.resolve({ users: [] }),
    getRegistrationLookups(),
    getRegistrationRequirements(),
    /* Fails soft. Save-and-resume is a convenience layered over a form that
       works without it; a draft listing being unavailable must not take the
       registration screen down. */
    getRegistrationDrafts().catch(() => []),
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
        description="Capture the customer's details and KYC, save, then verify their face — here or from any device."
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
        currentUser={{ id: user.id, name: user.name }}
        employees={users.users.map((u) => ({ id: u.id, name: u.name }))}
        canAssignOfficer={canAssignOfficer}
        lookups={lookups}
        profiles={requirements.profiles}
        externalVerification={requirements.externalVerification}
        openDrafts={drafts}
      />
    </>
  );
}
