import { z } from "zod";
import { ACTIVE_INACTIVE, BRANCH_TYPES } from "@/types/enums";

/**
 * Mirrors docs/backend-architecture-specification.md §2.2. IDs are strings
 * in the mock layer (readable slugs like "br-hq") standing in for the real
 * schema's BIGINT UNSIGNED autoincrement keys.
 */

export const RegionSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type Region = z.infer<typeof RegionSchema>;

export const DistrictSchema = z.object({
  id: z.string(),
  regionId: z.string(),
  name: z.string(),
});
export type District = z.infer<typeof DistrictSchema>;

export const WardSchema = z.object({
  id: z.string(),
  districtId: z.string(),
  name: z.string(),
});
export type Ward = z.infer<typeof WardSchema>;

export const StreetSchema = z.object({
  id: z.string(),
  wardId: z.string(),
  name: z.string(),
});
export type Street = z.infer<typeof StreetSchema>;

export const ZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  zoneManagerId: z.string().nullable(),
  deletedAt: z.string().nullable(),
});
export type Zone = z.infer<typeof ZoneSchema>;

export const BranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  /**
   * The segment that appears in every customer payment reference this branch
   * issues — `MF-YYYY-BRANCHCODE-000001`. Short, uppercase and stable, because
   * customers read it aloud when they pay.
   */
  code: z.string(),
  regionId: z.string().nullable(),
  zoneId: z.string().nullable(),
  phone: z.string(),
  type: z.enum(BRANCH_TYPES),
  parentBranchId: z.string().nullable(),
  /** Marks the single HQ branch — backend spec §12 Decision 2. At most one true. */
  isHeadOffice: z.boolean(),
  status: z.enum(ACTIVE_INACTIVE),
  createdBy: z.string().nullable(),
  deletedAt: z.string().nullable(),
});
export type Branch = z.infer<typeof BranchSchema>;

export const CreateBranchInputSchema = BranchSchema.pick({
  name: true,
  regionId: true,
  zoneId: true,
  phone: true,
  type: true,
  parentBranchId: true,
}).partial({ regionId: true, zoneId: true, parentBranchId: true });
export type CreateBranchInput = z.infer<typeof CreateBranchInputSchema>;
