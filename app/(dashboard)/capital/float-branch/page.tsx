import { ArrowLeftRight } from "lucide-react";
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

export default async function FloatBranchPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  const [branches, { transfers, total }] = await Promise.all([
    getBranches().catch(() => []),
    getFloatTransfers({ kind: "branch_to_branch" }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ArrowLeftRight}
        title="Float Branch To Branch"
        description="Transfers between branches. Raised pending — a second person approves before any money moves."
        breadcrumb={[{ label: "Capital", href: "/capital/shareholders" }, { label: "Branch To Branch" }]}
      />

      <FloatTransferForm
        kind="branch_to_branch"
        title="Raise a transfer"
        description="Nothing is posted until it is approved by someone other than you."
        submitLabel="Transfer"
        branches={branches.filter((b) => b.deletedAt === null).map((b) => ({ id: b.id, name: b.name }))}
      />

      <div className="space-y-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--st-ink)]">Transaction List</h2>
        <FloatTable transfers={transfers} variant="branch" currentUserId={user.id} total={total} />
      </div>
    </div>
  );
}
