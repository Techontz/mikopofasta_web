import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { TellerSessionView } from "@/features/legacy-modules/teller-session-view";
import { findProfile } from "@/lib/legacy/profile-fixtures";

/**
 * Teller → Customer Loan Information.
 *
 * Where picking somebody on the Teller Dashboard lands. The customer number is
 * the URL segment, so a session is linkable and a reload comes back to the same
 * customer.
 *
 * DESIGN ONLY: everything comes from `lib/legacy/profile-fixtures.ts`.
 */
export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.TREASURY_VIEW])) return <AccessDeniedState />;

  const { customerId } = await params;
  const profile = findProfile(customerId);
  if (!profile) notFound();

  return (
    <>
      <PageHeader
        icon={Wallet}
        title="Customer Loan Information"
        description={`${profile.fullName} · ${profile.branch}`}
        breadcrumb={[{ label: "Teller", href: "/teller" }, { label: "Customer Loan Information" }]}
        actions={
          <Link href="/teller" className="st-btn st-btn-secondary">
            <ArrowLeft className="size-4" strokeWidth={1.9} aria-hidden />
            Back to Teller
          </Link>
        }
      />
      <TellerSessionView profile={profile} />
    </>
  );
}
