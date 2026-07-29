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
import { NOTIFICATION_CHANNELS } from "@/types/enums";
import type { NotificationTemplate } from "@/types/notification-template";

function ActiveSwitch({ template }: { template: NotificationTemplate }) {
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={template.active}
      disabled={pending}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          const result = await toggleTemplateActive(template.id, checked);
          if (!result.ok) toast.error(result.message);
        })
      }
    />
  );
}

export function TemplatesTable({ templates }: { templates: NotificationTemplate[] }) {
  const columns: ColumnDef<NotificationTemplate>[] = [
    { accessorKey: "name", header: ({ column }) => <DataTableColumnHeader column={column} title="Name" /> },
    {
      accessorKey: "triggerEvent",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Trigger" />,
      cell: ({ row }) => <span className="capitalize">{row.original.triggerEvent.replace(/_/g, " ")}</span>,
    },
    {
      accessorKey: "channel",
      header: "Channel",
      cell: ({ row }) => <StatusBadge tone="info" dot={false} className="uppercase">{row.original.channel}</StatusBadge>,
      filterFn: "arrIncludesSome",
    },
    { id: "active", header: "Active", cell: ({ row }) => <ActiveSwitch template={row.original} /> },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <TemplateFormDialog template={row.original} />
          <ConfirmDeleteDialog
            trigger={
              <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive">
                <Trash2 />
              </Button>
            }
            title="Delete notification template?"
            description={`"${row.original.name}" will be permanently removed. This can't be undone.`}
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
      facetedFilters={[{ columnId: "channel", title: "Channel", options: NOTIFICATION_CHANNELS.map((c) => ({ label: c.toUpperCase(), value: c })) }]}
      toolbarAction={<TemplateFormDialog />}
      emptyState={{ icon: BellRing, title: "No notification templates yet", description: "Create a template to start sending event-triggered messages." }}
    />
  );
}
