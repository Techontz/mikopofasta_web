"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { BadgeCheck, ClipboardCheck, Eye, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ReasonDialog } from "@/features/customers/profile/reason-dialog";
import { approveCustomer, rejectCustomer } from "@/features/customers/actions";
import type { PendingRegistration } from "@/lib/api/customers";

/**
 * Customer → Registration Approval.
 *
 * The manager-approval stage of registration, and a different thing from the
 * loan approval chain: this decides whether a CUSTOMER is sound, while Loan
 * Officer → Branch Manager → Zone/Credit → Finance decides whether a LOAN is.
 * They share no permission — this is `customers.approve`.
 *
 * WHAT IS SHOWN AND WHY. Every column is something a manager needs before
 * deciding, and the two that matter most are the ones a list would normally
 * omit: whether the face scan actually passed, and what is still outstanding.
 * A row that cannot be approved says so and disables the button, rather than
 * offering it and failing at the API.
 *
 * THE BUTTON IS NOT THE CONTROL. `DecideCustomerApprovalAction` independently
 * refuses an incomplete file, refuses a second decision, and refuses anyone
 * approving a customer they registered themselves. Disabling here is a
 * courtesy to the manager; the enforcement is server-side, where it cannot be
 * clicked past.
 */
export function RegistrationApprovalsTable({
  registrations,
  currentUserId,
}: {
  registrations: PendingRegistration[];
  /** Used only to explain a disabled button — the API enforces the same rule. */
  currentUserId: string;
}) {
  const columns: ColumnDef<PendingRegistration>[] = [
    {
      accessorKey: "fullName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="whitespace-nowrap font-medium">{row.original.fullName}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {row.original.customerNumber} · {row.original.phone}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "branchName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Branch" />,
      cell: ({ row }) => row.original.branchName ?? "—",
      filterFn: "arrIncludesSome",
    },
    {
      id: "registeredBy",
      header: "Registered by",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-sm">{row.original.registeredByName ?? "—"}</p>
          <p className="text-[12px] text-muted-foreground">{row.original.registeredAt ?? "—"}</p>
        </div>
      ),
    },
    {
      id: "accountType",
      header: "Account / Category",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-sm">{row.original.accountTypeName ?? "—"}</p>
          <p className="text-[12px] text-muted-foreground">{row.original.categoryName ?? "No category"}</p>
        </div>
      ),
    },
    {
      id: "kyc",
      header: "KYC",
      cell: ({ row }) => (
        <StatusBadge tone={row.original.kycStatus === "completed" ? "active" : "inactive"}>
          {row.original.kycStatus === "completed" ? "Complete" : "Incomplete"}
        </StatusBadge>
      ),
    },
    {
      id: "face",
      header: "Face",
      cell: ({ row }) => (
        <StatusBadge tone={row.original.faceVerified ? "active" : "inactive"}>
          {row.original.faceVerified ? "Verified" : "Pending"}
        </StatusBadge>
      ),
    },
    {
      id: "outstanding",
      header: "Outstanding",
      cell: ({ row }) =>
        row.original.outstanding.length === 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <BadgeCheck className="size-3.5" aria-hidden />
            Nothing
          </span>
        ) : (
          /* Named, not counted. "3 items outstanding" sends the manager to the
             profile to find out which; the list itself is the useful thing. */
          <ul className="max-w-xs space-y-0.5 text-[12px] text-amber-700 dark:text-amber-400">
            {row.original.outstanding.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
            {row.original.outstanding.length > 3 && (
              <li className="text-muted-foreground">
                +{row.original.outstanding.length - 3} more
              </li>
            )}
          </ul>
        ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => <RowActions registration={row.original} currentUserId={currentUserId} />,
    },
  ];

  return (
    <SettingsCard
      title={`Awaiting registration approval (${registrations.length})`}
      description="Registrations that are complete and need a manager's decision before the customer can borrow."
    >
      <SettingsTable
        columns={columns}
        data={registrations}
        searchFields={["fullName", "customerNumber", "phone"]}
        searchPlaceholder="Search by name, customer number or phone…"
        facetedFilters={[
          {
            columnId: "branchName",
            title: "Branch",
            options: [
              ...new Set(registrations.map((r) => r.branchName).filter((b): b is string => !!b)),
            ].map((b) => ({ label: b, value: b })),
          },
        ]}
        emptyState={{
          icon: ClipboardCheck,
          title: "Nothing waiting for approval",
          description:
            "Registrations appear here once KYC and face verification are complete. Until then they are still with the registering officer.",
        }}
      />
    </SettingsCard>
  );
}

function RowActions({
  registration,
  currentUserId,
}: {
  registration: PendingRegistration;
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();

  /*
   * Two separate reasons a decision may be unavailable, and they need
   * different words. "Complete the outstanding items" is somebody's job;
   * "you registered this customer" is not a fault at all, it is the
   * separation of duties working.
   */
  const ownRegistration = registration.registeredById === currentUserId;
  const incomplete = registration.outstanding.length > 0;
  const blocked = ownRegistration || incomplete;

  const why = ownRegistration
    ? "You registered this customer — another approver must decide"
    : incomplete
      ? "Registration is not complete yet"
      : undefined;

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        nativeButton={false}
        render={
          <Link href={`/customers/${registration.id}`}>
            <Eye className="size-3.5" aria-hidden />
            View
          </Link>
        }
      />

      <Button
        size="sm"
        disabled={pending || blocked}
        title={why}
        onClick={() =>
          startTransition(async () => {
            const result = await approveCustomer(registration.id);
            if (result.ok) toast.success(result.message);
            else toast.error(result.message);
          })
        }
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <BadgeCheck className="size-3.5" />}
        Approve
      </Button>

      {/*
        Return and reject are one transition. The customer enum has no separate
        "returned" state and does not need one — what the officer must be able
        to do is read why, correct the record and re-submit, which the profile
        offers on a returned registration.
      */}
      <ReasonDialog
        trigger={
          <Button size="sm" variant="outline" disabled={pending}>
            <Undo2 className="size-3.5" aria-hidden />
            Return
          </Button>
        }
        title="Return this registration?"
        description={`${registration.fullName} goes back to ${registration.registeredByName ?? "the registering officer"} for correction. Say what needs fixing — they will see this reason.`}
        confirmLabel="Return registration"
        onConfirm={(reason) => rejectCustomer(registration.id, reason)}
      />

      {why && <span className="sr-only">{why}</span>}
    </div>
  );
}
