"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Snowflake, ThumbsDown, ThumbsUp, Undo2, UserRoundCheck, UserRoundX } from "lucide-react";
import { CustomerAvatar } from "@/components/customer-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/features/customers/profile/reason-dialog";
import {
  approveCustomer,
  freezeCustomer,
  rejectCustomer,
  resubmitCustomerRegistration,
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
        {/* The KYC capture when there is one, initials otherwise — the same
            component and the same tint the customer carries on every other
            screen, so the person is recognisable before the name is read. */}
        <CustomerAvatar name={fullName} photoUrl={customer.photoPath} size="lg" />
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

        {/*
          A returned registration, corrected and sent back. Offered to the
          officer who can edit the record rather than to the approver — and
          only once a manager has actually returned it.
        */}
        {canManage && customer.approvalStatus === "rejected" && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => runSimple(() => resubmitCustomerRegistration(customer.id))}
          >
            <Undo2 className="size-4" />
            Re-submit for approval
          </Button>
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
        {/*
          Suspend and Reactivate now ask for a reason, like Freeze and Reject.
          Stopping a customer borrowing — and letting them start again — are
          decisions somebody is accountable for, and until now they were the
          only ones in this header recorded as a bare status change.
        */}
        {canManage && customer.status !== "frozen" && (
          <ReasonDialog
            trigger={
              <Button size="sm" variant="outline" disabled={pending}>
                {customer.status === "active" ? (
                  <UserRoundX className="size-4" />
                ) : (
                  <UserRoundCheck className="size-4" />
                )}
                {customer.status === "active" ? "Suspend" : "Reactivate"}
              </Button>
            }
            title={customer.status === "active" ? "Suspend this customer?" : "Reactivate this customer?"}
            description={
              customer.status === "active"
                ? `"${fullName}" will be blocked from new loan applications until reactivated.`
                : `"${fullName}" will be able to apply for loans again.`
            }
            confirmLabel={customer.status === "active" ? "Suspend" : "Reactivate"}
            destructive={customer.status === "active"}
            withRemarks
            onConfirm={(reason, remarks) =>
              setCustomerActiveStatus(customer.id, customer.status !== "active", reason, remarks)
            }
          />
        )}
      </div>
    </div>
  );
}
