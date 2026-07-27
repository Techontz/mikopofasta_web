"use client";

import { Fragment, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERMISSION_GROUPS, PERMISSION_LABELS, ROLE_LABELS } from "@/config/permissions";
import { ROLES, type Role } from "@/types/auth";
import { toggleRolePermission } from "@/features/admin/roles/roles-actions";

interface PermissionMatrixProps {
  rolePermissions: Record<Role, string[]>;
  canEdit: boolean;
}

export function PermissionMatrix({ rolePermissions, canEdit }: PermissionMatrixProps) {
  const [pending, startTransition] = useTransition();

  return (
    <ScrollArea className="w-full rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 min-w-48 bg-background">Permission</TableHead>
            {ROLES.map((role) => (
              <TableHead key={role} className="min-w-28 text-center">
                {ROLE_LABELS[role]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PERMISSION_GROUPS.map((group) => (
            <Fragment key={group.label}>
              <TableRow key={group.label} className="bg-muted/40 hover:bg-muted/40">
                <TableCell colSpan={ROLES.length + 1} className="py-1.5 text-xs font-semibold text-muted-foreground">
                  {group.label}
                </TableCell>
              </TableRow>
              {group.permissions.map((permission) => (
                <TableRow key={permission}>
                  <TableCell className="sticky left-0 z-10 bg-background font-mono text-xs">{PERMISSION_LABELS[permission]}</TableCell>
                  {ROLES.map((role) => {
                    const isSuperAdmin = role === "super_admin";
                    const checked = isSuperAdmin || rolePermissions[role].includes(permission);
                    return (
                      <TableCell key={role} className="text-center">
                        <Checkbox
                          checked={checked}
                          disabled={!canEdit || isSuperAdmin || pending}
                          onCheckedChange={(next) =>
                            startTransition(async () => {
                              const result = await toggleRolePermission(role, permission, next === true);
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
