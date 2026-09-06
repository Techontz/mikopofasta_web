"use client";

import { Fragment, useTransition } from "react";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERMISSION_GROUPS, PERMISSION_LABELS, ROLE_LABELS } from "@/config/permissions";
import { ASSIGNABLE_ROLES, type Role } from "@/types/auth";
import { toggleRolePermission } from "@/features/admin/roles/roles-actions";

interface PermissionMatrixProps {
  rolePermissions: Record<Role, string[]>;
  canEdit: boolean;
}

export function PermissionMatrix({ rolePermissions, canEdit }: PermissionMatrixProps) {
  const [pending, startTransition] = useTransition();

  return (
    <ScrollArea className="st-card w-full">
      <Table className="st-table">
        <TableHeader>
          <TableRow>
            {/* The permission name stays put while the roles scroll past it. */}
            <TableHead className="sticky left-0 z-20 min-w-52 bg-[var(--st-subtle)]">Permission</TableHead>
            {ASSIGNABLE_ROLES.map((role) => (
              <TableHead key={role} className="min-w-28 text-center [&]:text-center">
                {ROLE_LABELS[role]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PERMISSION_GROUPS.map((group) => (
            <Fragment key={group.label}>
              <TableRow key={group.label} className="hover:bg-transparent">
                <TableCell
                  colSpan={ASSIGNABLE_ROLES.length + 1}
                  className="sticky left-0 py-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--st-ink-faint)]"
                  style={{ background: "var(--st-subtle-strong)" }}
                >
                  {group.label}
                </TableCell>
              </TableRow>
              {group.permissions.map((permission) => (
                <TableRow key={permission}>
                  <TableCell className="sticky left-0 z-10 bg-[var(--st-card)] font-mono text-[12.5px]">
                    {PERMISSION_LABELS[permission]}
                  </TableCell>
                  {ASSIGNABLE_ROLES.map((role) => {
                    const isSuperAdmin = role === "super_admin";
                    const checked = isSuperAdmin || rolePermissions[role].includes(permission);
                    return (
                      <TableCell key={role} className="text-center">
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--st-accent)] disabled:opacity-45"
                          aria-label={`${PERMISSION_LABELS[permission]} for ${ROLE_LABELS[role]}`}
                          checked={checked}
                          disabled={!canEdit || isSuperAdmin || pending}
                          onChange={(e) =>
                            startTransition(async () => {
                              const result = await toggleRolePermission(role, permission, e.target.checked);
                              if (!result.ok) toast.error(result.message);
                            })
                          }
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
