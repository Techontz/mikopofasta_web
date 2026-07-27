import { z } from "zod";
import { GUARANTOR_RELATIONSHIPS } from "@/types/enums";

/** Not in the original 54 — a standard KYC concept added for Phase 3's full registration wizard. */
export const NextOfKinSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  name: z.string(),
  relationship: z.enum(GUARANTOR_RELATIONSHIPS),
  phone: z.string(),
  address: z.string().nullable(),
  createdAt: z.string(),
});
export type NextOfKin = z.infer<typeof NextOfKinSchema>;

export const CreateNextOfKinInputSchema = NextOfKinSchema.pick({ name: true, relationship: true, phone: true, address: true });
export type CreateNextOfKinInput = z.infer<typeof CreateNextOfKinInputSchema>;
