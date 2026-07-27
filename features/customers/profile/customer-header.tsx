"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Snowflake, ThumbsDown, ThumbsUp, UserRoundCheck, UserRoundX } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/features/customers/profile/reason-dialog";
import {
  approveCustomer,
  freezeCustomer,
  rejectCustomer,
  setCustomerActiveStatus,
  unfreezeCustomer,
} from "@/features/customers/actions";
import { customerFullName, type Customer } from "@/types/customer";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = { active: "default", suspended: "secondary", frozen: "destructive" };
const APPROVAL_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  not_required: "outline",
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function CustomerHeader({
  customer,
  canManage,
  canApprove,
}: {
  customer: Customer;
  canManage: boolean;
  canApprove: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const fullName = customerFullName(customer);

  function runSimple(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          <AvatarFallback className="text-base">{initials(fullName)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{fullName}</h1>
            <Badge variant={STATUS_VARIANT[customer.status]} className="capitalize">
              {customer.status}
            </Badge>
            {customer.approvalStatus !== "not_required" && (
              <Badge variant={APPROVAL_VARIANT[customer.approvalStatus]} className="capitalize">
                {customer.approvalStatus}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {customer.customerNumber} · {customer.phone}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {canApprove && customer.approvalStatus === "pending" && (
          <>
            <Button size="sm" disabled={pending} onClick={() => runSimple(() => approveCustomer(customer.id))}>
              <ThumbsUp className="size-4" />
              Approve
            </Button>
            <ReasonDialog
              trigger={
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                  <ThumbsDown className="size-4" />
                  Reject
                </Button>
              }
              title="Reject customer registration?"
              description={`"${fullName}" will be marked rejected and blocked from loan eligibility until re-reviewed.`}
              confirmLabel="Reject"
              destructive
              onConfirm={(reason) => rejectCustomer(customer.id, reason)}
            />
          </>
        )}

        {canManage && customer.status !== "frozen" && (
          <ReasonDialog
            trigger={
              <Button size="sm" variant="outline">
                <Snowflake className="size-4" />
                Freeze
              </Button>
            }
            title="Freeze this account?"
            description={`"${fullName}" will be blocked from new loan applications until unfrozen.`}
            confirmLabel="Freeze Account"
            destructive
            onConfirm={(reason) => freezeCustomer(customer.id, reason)}
          />
        )}
        {canManage && customer.status === "frozen" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => runSimple(() => unfreezeCustomer(customer.id))}>
            <Snowflake className="size-4" />
            Unfreeze
          </Button>
        )}
        {canManage && customer.status !== "frozen" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => runSimple(() => setCustomerActiveStatus(customer.id, customer.status !== "active"))}
          >
            {customer.status === "active" ? <UserRoundX className="size-4" /> : <UserRoundCheck className="size-4" />}
            {customer.status === "active" ? "Suspend" : "Reactivate"}
          </Button>
        )}
      </div>
    </div>
  );
}
