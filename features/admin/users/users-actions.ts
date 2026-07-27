"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROLES } from "@/types/auth";
import { MOCK_USERS, type MockCredential } from "@/lib/mock-data/users";
import { nextId, upsert } from "@/lib/domain/mock-store";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

const CreateUserSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(9),
  email: z.string().email().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(ROLES),
  branchId: z.string().nullable(),
  zoneId: z.string().nullable(),
  regionId: z.string().nullable(),
});
export type CreateUserValues = z.infer<typeof CreateUserSchema>;

const UpdateUserSchema = CreateUserSchema.omit({ password: true });
export type UpdateUserValues = z.infer<typeof UpdateUserSchema>;

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

async function requirePermission(): Promise<ActionResult | null> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.USERS_MANAGE)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  return null;
}

export async function createUser(input: CreateUserValues): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = CreateUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  if (findUserByPhoneAnyStatus(parsed.data.phone)) {
    return { ok: false, message: "A user with this phone number already exists." };
  }

  const actor = await getCurrentUser();
  const newUser: MockCredential = {
    id: nextId("user"),
    ...parsed.data,
    extraPermissions: [],
    avatarInitials: initials(parsed.data.name),
    status: "active",
    lastLoginAt: null,
    createdBy: actor?.id ?? null,
    deletedAt: null,
  };
  upsert(MOCK_USERS, newUser);
  revalidatePath("/admin/users");
  return { ok: true, message: "User created." };
}

export async function updateUser(id: string, input: UpdateUserValues): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = UpdateUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const existing = MOCK_USERS.find((u) => u.id === id);
  if (!existing) return { ok: false, message: "User not found." };

  upsert(MOCK_USERS, { ...existing, ...parsed.data, avatarInitials: initials(parsed.data.name) });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  return { ok: true, message: "User updated." };
}

export async function setUserStatus(id: string, status: "active" | "suspended"): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const actor = await getCurrentUser();
  if (actor?.id === id) return { ok: false, message: "You can't change your own account status." };

  const existing = MOCK_USERS.find((u) => u.id === id);
  if (!existing) return { ok: false, message: "User not found." };

  existing.status = status;
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  return { ok: true, message: status === "active" ? "User re-enabled." : "User disabled." };
}

function findUserByPhoneAnyStatus(phone: string) {
  return MOCK_USERS.find((u) => u.phone === phone);
}
