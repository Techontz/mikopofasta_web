"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { ScheduleFormDialog } from "@/features/admin/repayment-schedules/schedule-form-dialog";
import { deleteRepaymentSchedule } from "@/features/admin/repayment-schedules/actions";
import type { RepaymentScheduleRecord } from "@/lib/api/system-configuration";

export function SchedulesTable({ schedules }: { schedules: RepaymentScheduleRecord[] }) {
  const columns: ColumnDef<RepaymentScheduleRecord>[] = [
    { accessorKey: "name", header: ({ column }) => <DataTableColumnHeader column={column} title="Name" /> },
    { accessorKey: "code", header: "Code" },
    {
      accessorKey: "frequencyDays",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Frequency" />,
      cell: ({ row }) => `Every ${row.original.frequencyDays} day${row.original.frequencyDays === 1 ? "" : "s"}`,
    },
    {
      id: "usage",
      header: "In use by",
      cell: ({ row }) => {
        const { loanCount, productCount } = row.original;
        if (loanCount === 0 && productCount === 0) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <span className="text-sm text-muted-foreground">
            {loanCount > 0 && `${loanCount} loan${loanCount === 1 ? "" : "s"}`}
            {loanCount > 0 && productCount > 0 && ", "}
            {productCount > 0 && `${productCount} product${productCount === 1 ? "" : "s"}`}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        /*
         * A schedule in use cannot be retired, and one with loans on it cannot
         * change frequency — its `frequencyDays` generated every instalment
         * date on those loans. The API refuses either with a 409; the button is
         * disabled here so the reason is visible before the click rather than
         * as a toast after it.
         */
        const inUse = row.original.loanCount > 0 || row.original.productCount > 0;

        return (
          <div className="flex justify-end gap-1">
            <ScheduleFormDialog schedule={row.original} />
            {inUse ? (
              <Button
                variant="ghost"
                size="icon-sm"
                disabled
                className="text-muted-foreground"
                title={
                  row.original.loanCount > 0
                    ? "Loans are running on this schedule."
                    : "A loan product still offers this schedule."
                }
              >
                <Trash2 />
              </Button>
            ) : (
              <ConfirmDeleteDialog
                trigger={
                  <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive">
                    <Trash2 />
                  </Button>
                }
                title="Delete repayment schedule?"
                description={`"${row.original.name}" will be retired. Historical loans keep the cadence they ran on.`}
                successMessage="Repayment schedule deleted."
                onConfirm={() => deleteRepaymentSchedule(row.original.id)}
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={schedules}
      searchFields={["name", "code"]}
      searchPlaceholder="Search schedules…"
      toolbarAction={<ScheduleFormDialog />}
      emptyState={{ icon: CalendarClock, title: "No repayment schedules yet", description: "Add a cadence like Daily, Weekly, or Monthly." }}
    />
  );
}
