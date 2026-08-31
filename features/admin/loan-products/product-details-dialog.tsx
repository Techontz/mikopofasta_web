"use client";

import * as React from "react";
import { List } from "lucide-react";
import { SettingsDialog } from "@/components/settings/dialog";
import { ActionButtons, Button, IconButton } from "@/components/settings/form";
import type { LoanProductWithConfig } from "@/lib/api/loans";

/**
 * The first of the four row actions: the branch list for one loan product.
 *
 * A plain list of the branches offering it, and nothing else — the same shape
 * as the screen this replaces. An empty assignment means the product is offered
 * at every branch, so the dialog says that rather than showing a blank table
 * the reader would have to interpret.
 *
 * Changing the assignment is the green action beside this one; this is read
 * only.
 */
export function ProductDetailsDialog({ product }: { product: LoanProductWithConfig }) {
  const [open, setOpen] = React.useState(false);
  const branches = product.branchNames ?? [];

  return (
    <SettingsDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<IconButton icon={List} label={`Branches offering ${product.name}`} tone="secondary" />}
      title={product.name}
      description="The branches that offer this loan product."
      footer={
        <ActionButtons>
          <Button type="button" tone="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </ActionButtons>
      }
    >
      {branches.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No branch is assigned, so this product is offered at every branch.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="px-3 py-2.5 text-left font-semibold">S/NO.</th>
                <th className="px-3 py-2.5 text-left font-semibold">Branch Name</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((name, index) => (
                <tr key={name} className="border-b last:border-0">
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{index + 1}.</td>
                  <td className="px-3 py-2.5">{name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SettingsDialog>
  );
}
