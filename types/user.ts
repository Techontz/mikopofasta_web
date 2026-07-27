import { z } from "zod";
import { ROLES } from "@/types/auth";
import { USER_STATUSES } from "@/types/enums";

/**
 * The full administrative `users` record (backend spec §2.1) — distinct from
 * `AuthenticatedUser` in types/auth.ts, which is the narrower session/JWT
 * shape actually carried in the BFF cookie. This is what an Admin manages
 * on a Users screen later (list/create/edit/deactivate).
 */
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email().nullable(),
  role: z.enum(ROLES),
  branchId: z.string().nullable(),
  zoneId: z.string().nullable(),
  regionId: z.string().nullable(),
  status: z.enum(USER_STATUSES),
  lastLoginAt: z.string().nullable(),
  createdBy: z.string().nullable(),
  deletedAt: z.string().nullable(),
});
export type User = z.infer<typeof UserSchema>;

export const CreateUserInputSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(9),
  email: z.string().email().nullable().optional(),
  role: z.enum(ROLES),
  branchId: z.string().nullable().optional(),
  zoneId: z.string().nullable().optional(),
  regionId: z.string().nullable().optional(),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
