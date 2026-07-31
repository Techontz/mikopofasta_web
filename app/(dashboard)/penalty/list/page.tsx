import { AlertTriangle } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { penaltyNavFor } from "@/features/ledger/nav-items";
import { getPenalties } from "@/lib/api/charges";
import { getBranches } from "@/lib/api/organization";
import { PenaltyListPanel } from "@/features/operations/penalty-panels";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.LOANS_VIEW, PERMISSIONS.REPAYMENTS_VIEW])) {
    return <AccessDeniedState />;
  }

  // Independent reads, so they go together rather than in sequence.
  const [penalties, branches] = await Promise.all([
    getPenalties({ perPage: 100 }),
    getBranches(),
  ]);

  return (
    <>
      <PageHeader
        icon={AlertTriangle}
        title="Penalty List"
        description="Penalties charged against customer loans, with what each loan was worth."
        breadcrumb={[{ label: "Penalty", href: "/penalty/list" }, { label: "Penalty List" }]}
      />
      <SectionNav items={penaltyNavFor(user)} />
      <PenaltyListPanel
        penalties={penalties.penalties}
        /*
         * Totals come from the server, over the whole set — a footer that only
         * added up the visible page would read differently on page two, which
         * is the classic way a report lies.
         */
        totals={{
          charged: penalties.totalCharged,
          paid: penalties.totalPaid,
          outstanding: penalties.totalOutstanding,
        }}
        branches={branches.map((b) => b.name)}
      />
    </>
  );
}
