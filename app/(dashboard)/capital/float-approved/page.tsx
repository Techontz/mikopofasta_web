import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getFloatTransfers } from "@/lib/api/capital";
import { PageHeader } from "@/components/settings";
import { FloatTable } from "@/features/capital/float/float-table";

export default async function ApprovedFloatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  // The same collection the branch screen shows, filtered to what was approved.
  const { transfers, total } = await getFloatTransfers({ kind: "branch_to_branch", status: "approved" });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CheckCircle2}
        title="Approved Float"
        description="Branch transfers that have been approved and posted to the ledger."
        breadcrumb={[
          { label: "Capital", href: "/capital/shareholders" },
          { label: "Float", href: "/capital/float-branch" },
          { label: "Approved Float" },
        ]}
      />

      <div className="space-y-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--st-ink)]">Transaction List Approved</h2>
        <FloatTable transfers={transfers} variant="approved" total={total} />
      </div>
    </div>
  );
}
