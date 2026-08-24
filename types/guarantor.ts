import { z } from "zod";
import { GENDERS, GUARANTOR_RELATIONSHIPS, MARITAL_STATUSES } from "@/types/enums";

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
  /* The same two enums the customer record uses for the same two facts —
     mirrors of the backend's Gender and MaritalStatus, which validate the
     submission with `Rule::in(...)`. Nullable: the guarantors already on the
     books have neither. */
  gender: z.enum(GENDERS).nullable().optional(),
  maritalStatus: z.enum(MARITAL_STATUSES).nullable().optional(),
  relationship: z.enum(GUARANTOR_RELATIONSHIPS),
  address: z.string().nullable(),
  occupation: z.string().nullable(),
  /* A signed, expiring URL to the private KYC disk — never a path. Null when
     no passport is on file, so "none" is distinguishable from "here it is". */
  passportUrl: z.string().nullable().optional(),
  passportName: z.string().nullable().optional(),
  passportMimeType: z.string().nullable().optional(),
  passportSizeBytes: z.number().nullable().optional(),
  createdAt: z.string(),
});
export type Guarantor = z.infer<typeof GuarantorSchema>;

/**
 * A guarantor as the import picker sees it — the same record, plus the customer
 * it already stands for.
 *
 * Two guarantors can share a name; the customer they belong to is what tells
 * them apart in the list. The API sends these two only on the cross-customer
 * endpoint, so they are optional here rather than on `GuarantorSchema`.
 */
export interface ImportableGuarantor extends Guarantor {
  customerName?: string | null;
  customerNumber?: string | null;
}

export const CreateGuarantorInputSchema = GuarantorSchema.pick({
  name: true,
  phone: true,
  nidaNumber: true,
  gender: true,
  maritalStatus: true,
  relationship: true,
  address: true,
  occupation: true,
});
export type CreateGuarantorInput = z.infer<typeof CreateGuarantorInputSchema>;
