import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, UserSearch } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { customerNavFor } from "@/features/ledger/nav-items";
import { LegacyProfileView } from "@/features/customers/profile/legacy-profile-view";
import { findProfile } from "@/lib/legacy/profile-fixtures";

/**
 * Customer → Customer Profile, for one customer.
 *
 * The customer number is the URL segment, so a profile is linkable and a
 * reload lands back on the same person — which the in-place version could not
 * do. An id nobody has is a 404 rather than an empty profile.
 *
 * DESIGN ONLY: every field comes from `lib/legacy/profile-fixtures.ts`.
 */
export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.CUSTOMERS_VIEW])) return <AccessDeniedState />;

  const { customerId } = await params;
  const profile = findProfile(customerId);
  if (!profile) notFound();

  /*
   * A deliberate pause, so the skeleton in loading.tsx is actually seen.
   *
   * The profile is resolved from an in-memory fixture and would otherwise
   * render in under a millisecond, which makes the loading state impossible to
   * review — and the loading state is part of what is being designed. DELETE
   * THIS LINE when the profile is wired to the API; the real fetch will supply
   * the wait on its own.
   */
  await new Promise((resolve) => setTimeout(resolve, 350));

  return (
    <>
      <PageHeader
        icon={UserSearch}
        title={profile.fullName}
        description="What the system holds on this customer, across the eight tabs the legacy profile carries."
        breadcrumb={[
          { label: "Customer", href: "/customers" },
          { label: "Customer Profile", href: "/customers/profile" },
          { label: profile.id },
        ]}
        actions={
          <Link href="/customers/profile" className="st-btn st-btn-secondary">
            <ArrowLeft className="size-4" strokeWidth={1.9} aria-hidden />
            Search again
          </Link>
        }
      />
      <SectionNav items={customerNavFor(user)} />
      <LegacyProfileView profile={profile} />
    </>
  );
}
