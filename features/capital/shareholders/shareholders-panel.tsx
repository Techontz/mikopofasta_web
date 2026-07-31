"use client";

import * as React from "react";
import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsTable } from "@/components/settings/table";
import { ActionButtons, Button, IconButton } from "@/components/settings/form";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ShareholderForm } from "@/features/capital/shareholders/shareholder-form";
import { deleteShareholder } from "@/features/capital/shareholders/actions";
import type { Shareholder } from "@/types/capital";

/**
 * Capital → Share Holders: the register form above, the list below, exactly as
 * the legacy screen arranges it.
 *
 * The two are one component because editing reuses the form in place — the
 * legacy screen has no separate edit page, and a dialog would put the same
 * five fields somewhere they aren't already.
 */
export function ShareholdersPanel({ shareholders }: { shareholders: Shareholder[] }) {
  const [editing, setEditing] = React.useState<Shareholder | null>(null);
  const formRef = React.useRef<HTMLDivElement>(null);

  function startEdit(shareholder: Shareholder) {
    setEditing(shareholder);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const columns: ColumnDef<Shareholder>[] = [
    {
      id: "sno",
      header: "S/No.",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-faint)]">{row.index + 1}.</span>,
    },
    {
      accessorKey: "fullName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Shareholder name" />,
      cell: ({ row }) => <span className="font-medium text-[var(--st-ink)]">{row.original.fullName}</span>,
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phone number" />,
      cell: ({ row }) => <span className="font-tabular">{row.original.phone}</span>,
    },
    { accessorKey: "email", header: ({ column }) => <DataTableColumnHeader column={column} title="Email" /> },
    {
      accessorKey: "gender",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sex" />,
      cell: ({ row }) => <span className="capitalize">{row.original.gender}</span>,
    },
    {
      accessorKey: "dateOfBirth",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date of Birth" />,
      cell: ({ row }) => <span className="font-tabular whitespace-nowrap">{row.original.dateOfBirth}</span>,
    },
    {
      id: "actions",
      header: "Action",
      /*
         Row actions rest at 62% and come to full strength on row hover or
         keyboard focus (see .st-row-action). In a table this dense a column of
         full-contrast icons competes with the data for attention; they are
         still plainly visible at rest, just not shouting.
      */
      cell: ({ row }) => (
        <div className="st-row-action flex justify-end gap-1.5">
          <IconButton
            icon={Pencil}
            label={`Edit ${row.original.fullName}`}
            tone="secondary"
            onClick={() => startEdit(row.original)}
          />
          <DeleteShareholderDialog shareholder={row.original} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div ref={formRef}>
        <ShareholderForm editing={editing} onDone={() => setEditing(null)} />
      </div>

      <SettingsTable
        columns={columns}
        data={shareholders}
        searchFields={["fullName", "phone", "email"]}
        searchPlaceholder="Search shareholders…"
        emptyState={{
          icon: Users,
          title: "No shareholders yet",
          description: "Register the first one using the form above.",
        }}
      />
    </div>
  );
}

/**
 * The API refuses to delete a shareholder who holds capital, so the button
 * says so up front rather than letting the click fail.
 */
function DeleteShareholderDialog({ shareholder }: { shareholder: Shareholder }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const held = shareholder.contributionCount > 0;

  function onDelete() {
    startTransition(async () => {
      const result = await deleteShareholder(shareholder.id);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  if (held) {
    return (
      <IconButton
        icon={Trash2}
        tone="secondary"
        disabled
        label={`${shareholder.fullName} holds capital and cannot be deleted`}
      />
    );
  }

  return (
    <>
      <IconButton
        icon={Trash2}
        tone="secondary"
        label={`Delete ${shareholder.fullName}`}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="st-scope">
          <DialogHeader>
            <DialogTitle>Delete {shareholder.fullName}?</DialogTitle>
            <DialogDescription>
              They hold no capital, so nothing in the ledger refers to them. This cannot be undone from here.
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
    </>
  );
}

