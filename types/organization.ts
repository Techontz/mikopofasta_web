import { z } from "zod";

/**
 * Singleton company/organization profile. Not in the original backend
 * schema (no dedicated table) — a small, clearly-scoped addition for the
 * Administration module's "Company Profile" screen, following the same
 * singleton-row pattern most Laravel apps use for org-wide settings.
 */
export const CompanyProfileSchema = z.object({
  id: z.literal("company-profile"),
  legalName: z.string(),
  tradingName: z.string(),
  registrationNumber: z.string(),
  tinNumber: z.string(),
  phone: z.string(),
  email: z.string().email(),
  address: z.string(),
  headquartersBranchId: z.string(),
  updatedBy: z.string().nullable(),
  updatedAt: z.string(),
});
export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;

export const UpdateCompanyProfileInputSchema = CompanyProfileSchema.pick({
  legalName: true,
  tradingName: true,
  registrationNumber: true,
  tinNumber: true,
  phone: true,
  email: true,
  address: true,
  headquartersBranchId: true,
});
export type UpdateCompanyProfileInput = z.infer<typeof UpdateCompanyProfileInputSchema>;
