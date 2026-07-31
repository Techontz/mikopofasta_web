import { Banknote } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getBranches } from "@/lib/api/organization";
import { getFloatTransfers } from "@/lib/api/capital";
import { PageHeader } from "@/components/settings";
import { FloatTransferForm } from "@/features/capital/float/float-transfer-form";
import { FloatTable } from "@/features/capital/float/float-table";

/** The operator's day, so "today" is Dar es Salaam's today and not UTC's. */
function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function FloatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  const day = today();
  const [branches, { transfers, total }] = await Promise.all([
    getBranches().catch(() => []),
    getFloatTransfers({ kind: "company_to_branch", from: day, to: day }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Banknote}
        title="Float"
        description="Move float from the company account to a branch. Applies immediately."
        breadcrumb={[
          { label: "Capital", href: "/capital/shareholders" },
          { label: "Transfer Float From Company Account To Blanch Account" },
        ]}
      />

      <FloatTransferForm
        kind="company_to_branch"
        title="Transfer Float Form"
        description="Cash leaves the head-office till and lands in the branch's."
        submitLabel="Transfer"
        branches={branches.filter((b) => b.deletedAt === null).map((b) => ({ id: b.id, name: b.name }))}
      />

      <div className="space-y-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--st-ink)]">Today Transaction</h2>
        <FloatTable transfers={transfers} variant="today" total={total} />
      </div>
    </div>
  );
}
