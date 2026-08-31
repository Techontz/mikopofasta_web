import { GitBranch } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getApprovalStages } from "@/lib/api/approval-stages";
import { ApprovalChainPanel } from "@/features/admin/approval-stages/approval-chain-panel";
import { PageHeader } from "@/components/settings";
import { PERMISSIONS } from "@/types/auth";

/**
 * Administration → Loan Approval Chain.
 *
 * The chain was always data — read by the workflow, snapshotted onto each loan
 * — but nothing reached it, which made "configurable" indistinguishable from
 * hardcoded. Branch Manager → Zone → Head Office Credit is one institution's
 * arrangement, not the application's.
 */
export default async function ApprovalStagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { stages, availableStatuses } = await getApprovalStages();

  /* Permission names come from the shared constant that mirrors the API's own
     enum, so a stage cannot name one the application does not define. */
  const permissions = Object.values(PERMISSIONS).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={GitBranch}
        title="Loan Approval Chain"
        description="Who signs a loan off, in what order. Configuration, not code — an institution with two tiers or five sets them here."
        breadcrumb={[{ label: "Administration", href: "/admin" }, { label: "Loan Approval Chain" }]}
      />
      <ApprovalChainPanel
        stages={stages}
        availableStatuses={availableStatuses}
        permissions={permissions}
      />
    </div>
  );
}
