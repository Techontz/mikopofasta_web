"use server";

import { revalidatePath } from "next/cache";
import { getRoles, updateRolePermissionsRequest } from "@/lib/api/users";
import { describeError } from "@/lib/api/errors";
import type { Permission, Role } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Settings → Roles & Permissions → the matrix.
 *
 * The grants live in the database and are what the API authorises against.
 * This used to mutate a module-level map in `config/permissions.ts`, which
 * meant a toggle changed what the browser believed and nothing else — the
 * server went on enforcing the grants it had.
 *
 * `roles.manage` is RolePolicy's, and super_admin's grants are fixed there
 * too. Neither is re-checked here.
 */
export async function toggleRolePermission(
  role: Role,
  permission: Permission,
  grant: boolean
): Promise<ActionResult> {
  let roles;

  try {
    roles = await getRoles();
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  const target = roles.find((r) => r.name === role);

  if (!target) {
    return { ok: false, message: "That role no longer exists." };
  }

  /*
   * The whole set is sent, not a diff.
   *
   * It is read immediately before the write, so what goes up is the server's
   * own current grants plus or minus this one — two administrators editing at
   * once cannot interleave into a combination neither chose.
   */
  const next = grant
    ? Array.from(new Set([...target.permissions, permission]))
    : target.permissions.filter((p) => p !== permission);

  try {
    await updateRolePermissionsRequest(target.id, next);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/roles");
  // Effective permissions are shown on each account.
  revalidatePath("/admin/users");

  return {
    ok: true,
    message: grant ? `${permission} granted.` : `${permission} revoked.`,
  };
}
