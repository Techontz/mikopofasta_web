"use client";

import Link from "next/link";
import { ArrowRightCircle } from "lucide-react";

/**
 * The third of the four row actions: ASSIGN BRANCH.
 *
 * Not a status toggle. It opens the Loan Category Assign screen for this
 * product — the two-panel view where branches are added to and removed from it.
 */
export function AssignBranchButton({ productId, name }: { productId: string; name: string }) {
  return (
    /* A link, not a button with an onClick: assignment is a page, so it should
       middle-click and open in a new tab like any other navigation. */
    <Link
      href={`/admin/loan-products/${productId}/branches`}
      aria-label={`Assign branches for ${name}`}
      title="Assign branches"
      className="inline-flex size-8 items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-600/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <ArrowRightCircle className="size-4" />
    </Link>
  );
}
