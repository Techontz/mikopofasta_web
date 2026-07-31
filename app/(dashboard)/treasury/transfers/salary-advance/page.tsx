import { Landmark } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { MOCK_BANK_ACCOUNT_RECORDS, MOCK_BANK_TRANSFERS } from "@/lib/mock-data/bank";
import { TransferPanel } from "@/features/bank/transfer-panel";

export default async function TransferSalaryAdvancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  const active = MOCK_BANK_ACCOUNT_RECORDS.filter((a) => a.status === "active");
  const sources = active.map((a) => ({
    value: a.id,
    label: `${a.bankName} — ${a.accountName}`,
    balance: a.balance,
  }));

  /*
   * The destination is one of the two purpose-held accounts this screen exists
   * to fund — the salary advance float or the disbursement account — so the
   * list is those, not every account. Identified by what they are for rather
   * than by name, which is why the label carries the purpose.
   */
  const destinations = active
    .filter((a) => /salary advance|disbursement/i.test(a.accountName))
    .map((a) => ({
      value: a.id,
      label: `${a.bankName} — ${a.accountName}`,
      balance: a.balance,
    }));

  return (
    <>
      <PageHeader
        icon={Landmark}
        title="Transfer Balance / Salary Advance & Disbursement Account"
        description="Fund the two accounts the company draws on to pay staff advances and to disburse loans."
        breadcrumb={[
          { label: "Bank", href: "/treasury" },
          { label: "Transfer Balance / Salary Advance & Disbursement Account" },
        ]}
      />
      <SectionNav items={treasuryNavFor(user)} />
      <TransferPanel
        kind="salary_advance"
        transfers={MOCK_BANK_TRANSFERS.filter((t) => t.kind === "salary_advance")}
        sources={sources}
        destinations={destinations}
        destinationLabel="Salary Advance / Disbursement Account"
        destinationColumnLabel="To Account"
        formTitle="Transfer to Salary Advance & Disbursement Account"
        formDescription="Both destinations are float accounts: what lands here is what staff advances and loan disbursements can draw on."
        historyTitle="Transfer History"
      />
    </>
  );
}
