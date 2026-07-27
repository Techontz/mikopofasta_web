"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { ScheduleFormDialog } from "@/features/admin/repayment-schedules/schedule-form-dialog";
import { deleteRepaymentSchedule } from "@/features/admin/repayment-schedules/actions";
import type { RepaymentSchedule } from "@/types/loan-product";

export function SchedulesTable({ schedules }: { schedules: RepaymentSchedule[] }) {
  const columns: ColumnDef<RepaymentSchedule>[] = [
    { accessorKey: "name", header: ({ column }) => <DataTableColumnHeader column={column} title="Name" /> },
    { accessorKey: "code", header: "Code" },
    {
      accessorKey: "frequencyDays",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Frequency" />,
      cell: ({ row }) => `Every ${row.original.frequencyDays} day${row.original.frequencyDays === 1 ? "" : "s"}`,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <ScheduleFormDialog schedule={row.original} />
          <ConfirmDeleteDialog
            trigger={
              <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive">
                <Trash2 />
              </Button>
            }
            title="Delete repayment schedule?"
            description={`"${row.original.name}" will be permanently removed. This can't be undone.`}
            successMessage="Repayment schedule deleted."
            onConfirm={() => deleteRepaymentSchedule(row.original.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={schedules}
      searchFields={["name", "code"]}
      searchPlaceholder="Search schedules…"
      toolbarAction={<ScheduleFormDialog />}
      emptyState={{ icon: CalendarClock, title: "No repayment schedules yet", description: "Add a cadence like Daily, Weekly, or Monthly." }}
    />
  );
}
