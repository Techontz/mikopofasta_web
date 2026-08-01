"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROLES } from "@/types/auth";
import {
  createUserRequest,
  deleteUserRequest,
  setUserStatusRequest,
  updateUserRequest,
} from "@/lib/api/users";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Settings → User Management.
 *
 * Authorization is UserPolicy's — `users.manage` on every write — and the §14
 * rule that matters is the API's too: a user may not change their own status.
 * Nothing here re-decides that; a second answer could only drift from the
 * server's.
 *
 * What does live here is the shape of the form, because the form is this side's.
 */

const CreateUserSchema = z.object({
  name: z.string().min(2, "Enter a name."),
  phone: z.string().min(9, "Enter a valid phone number."),
  email: z.string().email("Enter a valid email address.").nullable(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(ROLES),
  branchId: z.string().nullable(),
  zoneId: z.string().nullable(),
  regionId: z.string().nullable(),
});
export type CreateUserValues = z.infer<typeof CreateUserSchema>;

/**
 * The same fields without the password.
 *
 * Changing somebody's password is a different act from correcting their branch,
 * so it is not on the edit form at all.
 */
const UpdateUserSchema = CreateUserSchema.omit({ password: true });
export type UpdateUserValues = z.infer<typeof UpdateUserSchema>;

function revalidateUsers(id?: string): void {
  revalidatePath("/admin/users");
  // The roles screen counts users per role.
  revalidatePath("/admin/roles");
  if (id) revalidatePath(`/admin/users/${id}`);
}

export async function createUser(input: CreateUserValues): Promise<ActionResult> {
  const parsed = CreateUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    /*
     * A duplicate phone number is refused server-side, where the uniqueness
     * actually lives. Checking here first would race a concurrent create and
     * would still have to handle the server's answer.
     */
    await createUserRequest(parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateUsers();
  return { ok: true, message: `${parsed.data.name} added.` };
}

export async function updateUser(id: string, input: UpdateUserValues): Promise<ActionResult> {
  const parsed = UpdateUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await updateUserRequest(id, parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateUsers(id);
  return { ok: true, message: `${parsed.data.name} updated.` };
}

export async function setUserStatus(
  id: string,
  status: "active" | "suspended"
): Promise<ActionResult> {
  try {
    /*
     * "You cannot suspend yourself" is the API's rule, not this form's — it is
     * what stops an administrator locking everyone else out and then
     * themselves, and it belongs where it cannot be bypassed.
     */
    await setUserStatusRequest(id, status);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateUsers(id);
  return { ok: true, message: status === "active" ? "User re-enabled." : "User disabled." };
}

/**
 * Soft-deletes the account.
 *
 * The record and its history stay — a user who approved a loan last year must
 * remain nameable — so this removes access rather than the person.
 */
export async function deleteUser(id: string, name: string): Promise<ActionResult> {
  try {
    await deleteUserRequest(id);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateUsers(id);
  return { ok: true, message: `${name} removed.` };
}
