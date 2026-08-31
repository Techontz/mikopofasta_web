"use client";

import * as React from "react";
import { toast } from "sonner";

import type { ColumnDef } from "@tanstack/react-table";
import { Tags, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/settings";
import { Button } from "@/components/ui/button";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { CategoryFormDialog } from "@/features/admin/customer-categories/category-form-dialog";
import { RegistrationFormDialog } from "@/features/admin/customer-categories/registration-form-dialog";
import { deleteCustomerCategory, updateCustomerCategory } from "@/features/admin/customer-categories/actions";
import type { CustomerCategory } from "@/types/customer";
import type { MasterDataOption } from "@/types/master-data";

/**
 * `canManage` is the Super Admin, and only the Super Admin.
 *
 * The mirror of CustomerCategoryPolicy, which refuses a create, update or
 * delete from anybody else — including an Admin, who holds `admin.org_settings`
 * and can reach this screen. This hides the controls so the screen tells the
 * truth about what the person looking at it may do; it is not the enforcement,
 * and the server refuses the request either way.
 */
export function CategoriesTable({
  categories,
  documentTypes,
  canManage,
}: {
  categories: CustomerCategory[];
  /** Offered by the registration-form dialog as required or optional documents. */
  documentTypes: MasterDataOption[];
  canManage: boolean;
}) {
  const columns: ColumnDef<CustomerCategory>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer Type" />,
    },
    {
      id: "status",
      header: "Status",
      /* Deactivating retires a type from NEW registrations. Every customer
         already filed under it keeps their classification. */
      cell: ({ row }) => (
        <StatusBadge tone={row.original.isActive === false ? "neutral" : "active"}>
          {row.original.isActive === false ? "Inactive" : "Active"}
        </StatusBadge>
      ),
    },
    {
      id: "customers",
      header: "Customers",
      cell: ({ row }) => row.original.customerCount ?? 0,
    },
    {
      id: "form",
      header: "Registration form",
      /* What a type actually asks for, at a glance. A type with no configured
         questions asks a customer nothing beyond the basic information, and an
         administrator looking at this list should be able to see that without
         opening every row. */
      cell: ({ row }) => {
        const fields = row.original.dynamicFormSchema.length;
        const documents =
          row.original.requiredDocuments.length + (row.original.optionalDocuments?.length ?? 0);

        return fields === 0 && documents === 0 ? (
          <span className="text-muted-foreground">Not configured</span>
        ) : (
          <span className="text-muted-foreground">
            {fields} field{fields === 1 ? "" : "s"} · {documents} document{documents === 1 ? "" : "s"}
          </span>
        );
      },
    },
    ...(canManage
      ? [{
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <CategoryFormDialog category={row.original} />
          {/* What registration asks of a customer of this type. Its own dialog
              rather than more fields on the one above — naming a
              classification and deciding what it demands are different jobs,
              usually done at different times. */}
          <RegistrationFormDialog category={row.original} documentTypes={documentTypes} />
          <ActivationButton type={row.original} />
          <ConfirmDeleteDialog
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                /* Icon-only and destructive, so the name has to come from somewhere.
                   Without this the button announces as just "button", and every row
                   on the table announces identically. */
                aria-label={`Delete customer type ${row.original.name}`}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
              </Button>
            }
            title="Delete customer type?"
            /* Honest about the two outcomes: the server refuses the delete
               while customers are filed under it, and deactivating is the
               answer in that case. */
            description={
              (row.original.customerCount ?? 0) > 0
                ? `"${row.original.name}" is in use by ${row.original.customerCount} customer${row.original.customerCount === 1 ? "" : "s"} and cannot be deleted. Deactivate it instead to retire it from new registrations.`
                : `"${row.original.name}" will be permanently removed. This can't be undone.`
            }
            successMessage="Customer type deleted."
            onConfirm={() => deleteCustomerCategory(row.original.id)}
          />
        </div>
      ),
        } satisfies ColumnDef<CustomerCategory>]
      : []),
  ];

  return (
    <SettingsTable
      columns={columns}
      data={categories}
      searchFields={["name"]}
      searchPlaceholder="Search customer types…"
      toolbarAction={canManage ? <CategoryFormDialog /> : undefined}
      emptyState={
        canManage
          ? { icon: Tags, title: "No customer types yet", description: "Add the broad classifications your institution serves. None are shipped with the application." }
          : { icon: Tags, title: "No customer types yet", description: "Only the Super Administrator can create them. Please contact the Super Administrator." }
      }
    />
  );
}

/**
 * Retire a customer type, or bring it back.
 *
 * Not a delete: a type customers are already filed under must keep existing, or
 * their classification would vanish with it. Deactivating stops it being
 * offered to NEW registrations and leaves every existing customer exactly as
 * they are — which is what an institution actually wants when it stops serving
 * a group.
 *
 * The name is sent alongside because the API validates a name on every save;
 * everything else the payload omits is left untouched by design.
 */
function ActivationButton({ type }: { type: CustomerCategory }) {
  const [pending, start] = React.useTransition();
  const active = type.isActive !== false;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-label={`${active ? "Deactivate" : "Activate"} customer type ${type.name}`}
      title={active ? "Deactivate" : "Activate"}
      onClick={() =>
        start(async () => {
          const result = await updateCustomerCategory(type.id, { name: type.name, isActive: !active });
          toast[result.ok ? "success" : "error"](
            result.ok ? `${type.name} ${active ? "deactivated" : "activated"}.` : result.message
          );
        })
      }
    >
      {active ? <ToggleRight /> : <ToggleLeft />}
    </Button>
  );
}
