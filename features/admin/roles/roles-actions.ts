"use server";

import { revalidatePath } from "next/cache";
import { getRolePermissions, hasPermission, setRolePermissions } from "@/config/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS, type Permission, type Role } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

export async function toggleRolePermission(role: Role, permission: Permission, grant: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.ROLES_MANAGE)) {
    return { ok: false, message: "Only Super Admin can edit the permission matrix." };
  }

  const current = getRolePermissions(role);
  const next = grant ? Array.from(new Set([...current, permission])) : current.filter((p) => p !== permission);
  const result = setRolePermissions(role, next);
  if (result.ok) revalidatePath("/admin/roles");
  return result;
}
