import { z } from "zod";
import { GUARANTOR_RELATIONSHIPS } from "@/types/enums";

/**
 * Not a table in the original 54 — the docs mention guarantor name/phone
 * only as dynamic KYC fields for the Student category. Modeled as its own
 * entity here since Phase 3 needs a real Guarantors module (multiple
 * guarantors per customer, each independently manageable).
 */
export const GuarantorSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  name: z.string(),
  phone: z.string(),
  nidaNumber: z.string().nullable(),
  relationship: z.enum(GUARANTOR_RELATIONSHIPS),
  address: z.string().nullable(),
  occupation: z.string().nullable(),
  createdAt: z.string(),
});
export type Guarantor = z.infer<typeof GuarantorSchema>;

export const CreateGuarantorInputSchema = GuarantorSchema.pick({
  name: true,
  phone: true,
  nidaNumber: true,
  relationship: true,
  address: true,
  occupation: true,
});
export type CreateGuarantorInput = z.infer<typeof CreateGuarantorInputSchema>;
