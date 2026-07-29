import { z } from "zod";

/** CRM-style free-text notes staff attach to a customer profile — not in the original 54 tables. */
export const CustomerNoteSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  authorId: z.string(),
  /**
   * Resolved by the API when it eager-loads the author, so the notes panel no
   * longer needs a local user list to turn an id into a name.
   */
  authorName: z.string().nullable().optional(),
  note: z.string(),
  createdAt: z.string(),
});
export type CustomerNote = z.infer<typeof CustomerNoteSchema>;

export const CreateCustomerNoteInputSchema = z.object({
  customerId: z.string(),
  note: z.string().min(1),
});
export type CreateCustomerNoteInput = z.infer<typeof CreateCustomerNoteInputSchema>;
