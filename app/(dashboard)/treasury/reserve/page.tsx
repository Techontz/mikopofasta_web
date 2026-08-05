import { PiggyBank, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader, SettingsCard, StatCard } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { formatMoney } from "@/lib/domain/money";
import { getReserveUtilisations } from "@/lib/api/accounting";
import { getBranches } from "@/lib/api/organization";
import { ReserveRequestDialog, ReserveTable } from "@/features/accounting/reserve-panel";

/**
 * The Reserve fund — Decision Register D1.
 *
 * "Reserve transfers require Admin approval. Branches cannot directly use
 * Reserve funds. Reserve belongs to Headquarters / Administration."
 *
 * Finance raises; Admin decides. The two grants are held by different roles, so
 * most readers of this screen can do one of the two and the buttons say which.
 */
export default async function ReservePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.LEDGER_VIEW)) return <AccessDeniedState />;

  const canRequest = hasPermission(user, PERMISSIONS.RESERVE_REQUEST);
  const canApprove = hasPermission(user, PERMISSIONS.RESERVE_APPROVE);

  /*
   * Branches come from the API, never a hardcoded list — the request form
   * offers whichever ones exist right now.
   */
  const [queue, branches] = await Promise.all([
    getReserveUtilisations().catch(() => ({ requests: [], reserveBalance: 0 })),
    getBranches().catch(() => []),
  ]);

  const pending = queue.requests.filter((r) => r.status === "pending");
  const released = queue.requests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <>
      <PageHeader
        icon={PiggyBank}
        title="Reserve Fund"
        description="Appropriated from realised profit at each month-end close, held by Headquarters, and released only on Admin approval."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Reserve Fund" }]}
        actions={
          canRequest ? (
            <ReserveRequestDialog
              branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            />
          ) : undefined
        }
      />

      <SectionNav items={treasuryNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Reserve balance"
          value={formatMoney(queue.reserveBalance)}
          hint="What the fund holds right now"
          icon={PiggyBank}
          tone="accent"
        />
        <StatCard label="Awaiting approval" value={String(pending.length)} icon={ShieldCheck} />
        <StatCard
          label="Pending amount"
          value={formatMoney(pending.reduce((sum, r) => sum + r.amount, 0))}
          icon={ShieldCheck}
        />
        <StatCard label="Released to date" value={formatMoney(released)} icon={ShieldCheck} />
      </div>

      <SettingsCard
        title="Reserve Requests"
        description={
          canApprove
            ? "Approving posts Dr Reserve · Cr Capital. You cannot decide a request you raised yourself."
            : canRequest
              ? "Raised for Admin approval. Nothing leaves the fund until an Admin approves it."
              : "Read-only. Raising a request needs reserve.request; releasing needs reserve.approve."
        }
        bodyClassName="p-0 sm:p-0"
      >
        <ReserveTable requests={queue.requests} currentUserId={user.id} canApprove={canApprove} />
      </SettingsCard>
    </>
  );
}
