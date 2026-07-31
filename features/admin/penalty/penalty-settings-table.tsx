"use client";

import * as React from "react";
import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Scale, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ActionButtons, Button, IconButton } from "@/components/settings/form";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { deletePenaltySetting } from "@/features/admin/penalty/actions";
import { formatMoney } from "@/lib/domain/money";
import { CHARGE_VALUE_TYPE_LABELS, type PenaltySetting } from "@/types/loan-charge";

/**
 * The list half of Settings → Penalty: calculation type, amount, delete —
 * the legacy screen's three columns.
 */
export function PenaltySettingsTable({ settings }: { settings: PenaltySetting[] }) {
  const columns: ColumnDef<PenaltySetting>[] = [
    {
      accessorKey: "calculationType",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Calculation type" />,
      cell: ({ row }) => (
        <StatusBadge tone="neutral" dot={false}>
          {CHARGE_VALUE_TYPE_LABELS[row.original.calculationType]}
        </StatusBadge>
      ),
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Penalty amount" />,
      // The unit follows the type — the same figure means very different
      // things under MONEY VALUE and PERCENTAGE VALUE.
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap">
          {row.original.calculationType === "percentage_value"
            ? `${row.original.amount}%`
            : formatMoney(row.original.amount)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DeletePenaltyDialog setting={row.original} />
        </div>
      ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={settings}
      emptyState={{
        icon: Scale,
        title: "No penalty default set",
        description: "Record one above. Loans already open keep the rate they were opened with.",
      }}
    />
  );
}

/**
 * Deleting is irreversible from the screen, so it asks first — the legacy
 * button removed the row on a single click.
 */
function DeletePenaltyDialog({ setting }: { setting: PenaltySetting }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();

  const reading =
    setting.calculationType === "percentage_value"
      ? `${setting.amount}%`
      : formatMoney(setting.amount);

  function onDelete() {
    startTransition(async () => {
      const result = await deletePenaltySetting(setting.id);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <IconButton
            icon={Trash2}
            label={`Delete the ${CHARGE_VALUE_TYPE_LABELS[setting.calculationType]} penalty of ${reading}`}
            tone="secondary"
          />
        }
      />
      <DialogContent className="st-scope">
        <DialogHeader>
          <DialogTitle>Delete this penalty default?</DialogTitle>
          <DialogDescription>
            {CHARGE_VALUE_TYPE_LABELS[setting.calculationType]} — {reading}. Loans already open are unaffected;
            they carry the rate they were opened with.
          </DialogDescription>
        </DialogHeader>
        <ActionButtons>
          <Button type="button" tone="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" tone="danger" onClick={onDelete} loading={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </ActionButtons>
      </DialogContent>
    </Dialog>
  );
}
