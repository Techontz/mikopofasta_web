"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/settings";
import { assignBranch, removeBranch } from "@/features/admin/loan-products/branch-actions";
import type { ProductBranchAssignment } from "@/lib/api/loan-product-branches";

/**
 * Loan Category Assign — the two-panel branch assignment screen.
 *
 * Left: the branches this product is not yet offered at, each with a + that
 * assigns it. Right: the ones it is, each with a delete that removes it. Two
 * plain tables, exactly as the screen this replaces: an administrator works
 * down one list and across to the other, and a combined multi-select would
 * hide which side a branch is currently on.
 *
 * Nothing here is a loan product setting. Assigning a branch writes one pivot
 * row and touches no part of the product's configuration.
 */
export function BranchAssignment({ productId, data }: { productId: string; data: ProductBranchAssignment }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SettingsCard title={data.product.name} description="Branches this product is not yet offered at.">
        {data.available.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Every branch already offers this product.
          </p>
        ) : (
          <AssignTable
            rows={data.available}
            columns={["S/NO.", "Branch Name", "Action"]}
            render={(branch) => <AssignButton productId={productId} branch={branch} />}
          />
        )}
      </SettingsCard>

      <SettingsCard
        title="Branch List Loan Category"
        description={
          data.offeredEverywhere
            ? "No branch is assigned, so this product is offered at every branch."
            : "Branches that offer this product."
        }
      >
        {data.assigned.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No branch assigned — the product is offered institution-wide.
          </p>
        ) : (
          <AssignTable
            rows={data.assigned}
            columns={["S/NO.", "Loan Category", "Branch", "Action"]}
            extraCell={() => data.product.name}
            render={(branch) => <RemoveButton productId={productId} branch={branch} />}
          />
        )}
      </SettingsCard>
    </div>
  );
}

/** One plain table. Horizontal rules and a blue header, as the reference has. */
function AssignTable({
  rows,
  columns,
  extraCell,
  render,
}: {
  rows: { id: string; name: string }[];
  columns: string[];
  extraCell?: (row: { id: string; name: string }) => React.ReactNode;
  render: (row: { id: string; name: string }) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-primary text-primary-foreground">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{index + 1}.</td>
              {extraCell && <td className="px-3 py-2.5">{extraCell(row)}</td>}
              <td className="px-3 py-2.5">{row.name}</td>
              <td className="px-3 py-2.5 text-right">{render(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssignButton({ productId, branch }: { productId: string; branch: { id: string; name: string } }) {
  const [pending, start] = React.useTransition();

  return (
    <Button
      size="icon-sm"
      disabled={pending}
      aria-label={`Assign ${branch.name}`}
      title={`Assign ${branch.name}`}
      onClick={() =>
        start(async () => {
          const result = await assignBranch(productId, branch.id);
          toast[result.ok ? "success" : "error"](result.ok ? `${branch.name} assigned.` : result.message);
        })
      }
    >
      <Plus />
    </Button>
  );
}

function RemoveButton({ productId, branch }: { productId: string; branch: { id: string; name: string } }) {
  const [pending, start] = React.useTransition();

  return (
    <Button
      size="icon-sm"
      variant="destructive"
      disabled={pending}
      aria-label={`Remove ${branch.name}`}
      title={`Remove ${branch.name}`}
      onClick={() =>
        start(async () => {
          const result = await removeBranch(productId, branch.id);
          toast[result.ok ? "success" : "error"](result.ok ? `${branch.name} removed.` : result.message);
        })
      }
    >
      <Trash2 />
    </Button>
  );
}
