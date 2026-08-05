"use client";

import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { BellRing, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/settings";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { TemplateFormDialog } from "@/features/admin/notification-templates/template-form-dialog";
import { deleteNotificationTemplate, toggleTemplateActive } from "@/features/admin/notification-templates/actions";
import type {
  NotificationTemplateRecord,
  NotificationTemplateVocabulary,
} from "@/lib/api/system-configuration";

function ActiveSwitch({ template }: { template: NotificationTemplateRecord }) {
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={template.active}
      disabled={pending}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          /*
           * The whole template goes up, not just the flag. The API validates a
           * message as a whole — placeholders against the event, subject against
           * the channel — so there is no partial update to send.
           *
           * Activating one while another is already live for the same event and
           * channel is refused: two live SMS templates for `payment_received`
           * would leave the sender picking arbitrarily.
           */
          const result = await toggleTemplateActive(template, checked);
          if (!result.ok) toast.error(result.message);
        })
      }
    />
  );
}

export function TemplatesTable({
  templates,
  vocabulary,
}: {
  templates: NotificationTemplateRecord[];
  vocabulary: NotificationTemplateVocabulary;
}) {
  const columns: ColumnDef<NotificationTemplateRecord>[] = [
    { accessorKey: "name", header: ({ column }) => <DataTableColumnHeader column={column} title="Name" /> },
    {
      accessorKey: "triggerEvent",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Trigger" />,
      // The server's label, not a regex on the value: it decides the vocabulary
      // and knows that `disbursement_success` reads as "Disbursement successful".
      cell: ({ row }) => <span>{row.original.triggerEventLabel}</span>,
    },
    {
      accessorKey: "channel",
      header: "Channel",
      cell: ({ row }) => (
        <StatusBadge tone="info" dot={false} className="uppercase">
          {row.original.channelLabel}
        </StatusBadge>
      ),
      filterFn: "arrIncludesSome",
    },
    { id: "active", header: "Active", cell: ({ row }) => <ActiveSwitch template={row.original} /> },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <TemplateFormDialog template={row.original} vocabulary={vocabulary} />
          <ConfirmDeleteDialog
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                /* Icon-only and destructive, so the name has to come from somewhere.
                   Without this the button announces as just "button", and every row
                   on the table announces identically. */
                aria-label={`Delete notification template ${row.original.name}`}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
              </Button>
            }
            title="Delete notification template?"
            description={`"${row.original.name}" will be retired. What customers were already told stays on the record.`}
            successMessage="Notification template deleted."
            onConfirm={() => deleteNotificationTemplate(row.original.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={templates}
      searchFields={["name", "body"]}
      searchPlaceholder="Search templates…"
      facetedFilters={[
        {
          columnId: "channel",
          title: "Channel",
          options: vocabulary.channels.map((c) => ({ label: c.label, value: c.value })),
        },
      ]}
      toolbarAction={<TemplateFormDialog vocabulary={vocabulary} />}
      emptyState={{ icon: BellRing, title: "No notification templates yet", description: "Create a template to start sending event-triggered messages." }}
    />
  );
}
