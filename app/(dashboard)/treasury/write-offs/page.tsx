import { FileX2, HandCoins } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader, SettingsCard, StatCard } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { formatMoney } from "@/lib/domain/money";
import { getWriteOffs } from "@/lib/api/accounting";
import { WriteOffTable } from "@/features/accounting/bad-debt-panel";

/**
 * The write-off register — §5's Write-Off (4200) and Recovered Loans (4300).
 *
 * A register rather than a workflow: writing a loan off and recording a
 * recovery are both decisions about one loan, so they live on the loan's own
 * screen. This is where the whole book of them is read.
 */
export default async function WriteOffRegisterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.LOANS_VIEW)) return <AccessDeniedState />;

  const register = await getWriteOffs().catch(() => ({
    writeOffs: [],
    principalWrittenOff: 0,
    recovered: 0,
    outstanding: 0,
  }));

  const recoveryRate =
    register.principalWrittenOff > 0
      ? `${((register.recovered / register.principalWrittenOff) * 100).toFixed(1)}%`
      : "—";

  return (
    <>
      <PageHeader
        icon={FileX2}
        title="Write-offs & Recovery"
        description="Loans the business stopped expecting to collect, and what has come back since."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Write-offs & Recovery" }]}
      />

      <SectionNav items={treasuryNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Principal written off"
          value={formatMoney(register.principalWrittenOff)}
          hint="What reached the ledger"
          icon={FileX2}
          tone="accent"
        />
        <StatCard label="Recovered" value={formatMoney(register.recovered)} icon={HandCoins} />
        <StatCard label="Still chasing" value={formatMoney(register.outstanding)} icon={HandCoins} />
        <StatCard label="Recovery rate" value={recoveryRate} icon={HandCoins} />
      </div>

      <SettingsCard
        title="Write-off Register"
        description="Only principal reaches the ledger — uncollected interest and penalty were never recognised as income, so they are recorded as forgone rather than reversed. Write off or record a recovery from the loan's own screen."
        bodyClassName="p-0 sm:p-0"
      >
        <WriteOffTable writeOffs={register.writeOffs} />
      </SettingsCard>
    </>
  );
}
