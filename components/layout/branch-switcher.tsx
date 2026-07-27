"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import type { Branch } from "@/types/branch";
import type { AuthenticatedUser } from "@/types/auth";

interface BranchSwitcherProps {
  branches: Branch[];
  user: AuthenticatedUser;
}

const ALL_BRANCHES = "__all__";

/**
 * Cross-branch scope is decided by the BRANCHES_VIEW_ALL permission, never
 * by whether the user has a home branch — every user has one (even HQ-wide
 * roles, based at Head Office), per backend spec §12 Decision 2. A role can
 * be "based at" a branch and still see every branch if it holds the
 * permission, matching §13 multi-branch scoping.
 */
export function BranchSwitcher({ branches, user }: BranchSwitcherProps) {
  const isHqScoped = hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL);
  const homeBranch = branches.find((b) => b.id === user.branchId);
  const [selected, setSelected] = React.useState<string>(isHqScoped ? ALL_BRANCHES : (user.branchId ?? ALL_BRANCHES));

  if (!isHqScoped) {
    return (
      <div className="hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm lg:flex">
        <Building2 className="size-4 text-muted-foreground" aria-hidden />
        <span className="font-medium">{homeBranch?.name ?? "Unknown Branch"}</span>
      </div>
    );
  }

  const selectedLabel = selected === ALL_BRANCHES ? "All Branches" : branches.find((b) => b.id === selected)?.name;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="gap-2 px-2.5 lg:px-3">
            <Building2 className="size-4" aria-hidden />
            <span className="hidden max-w-32 truncate lg:inline lg:max-w-none">{selectedLabel}</span>
            <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Branch scope</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setSelected(ALL_BRANCHES)}>
          <Check className={cn("size-4", selected !== ALL_BRANCHES && "invisible")} />
          All Branches
        </DropdownMenuItem>
        {branches.map((branch) => (
          <DropdownMenuItem key={branch.id} onClick={() => setSelected(branch.id)}>
            <Check className={cn("size-4", selected !== branch.id && "invisible")} />
            {branch.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
