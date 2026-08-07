import { z } from "zod";

/**
 * The signed-in user's own profile — `GET /auth/profile`.
 *
 * Split the way the API splits it, and the split is the point: `editable` is
 * what this person maintains about themselves, `readOnly` is what the
 * organisation has decided about them. The page renders the two differently so
 * nobody has to guess which is which, and the API refuses to write the second
 * regardless of what the form sends.
 *
 * Every `readOnly` field is nullable because the system genuinely may not hold
 * it — a user with no staff record has no employee number, and nobody outside
 * a zone has a recorded supervisor. The UI says "Not recorded" rather than
 * showing a blank that reads as missing data.
 */

export const NotificationPreferencesSchema = z.object({
  sms: z.boolean().optional(),
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
});
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export const ProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Sign-in is by phone, so that is the username. */
  username: z.string(),
  /** Signed and expiring; never a storage path. */
  photoUrl: z.string().nullable(),

  editable: z.object({
    phone: z.string(),
    email: z.string().nullable(),
    address: z.string().nullable(),
    emergencyContactName: z.string().nullable(),
    emergencyContactPhone: z.string().nullable(),
    emergencyContactRelationship: z.string().nullable(),
    nextOfKinName: z.string().nullable(),
    nextOfKinPhone: z.string().nullable(),
    nextOfKinRelationship: z.string().nullable(),
    preferredLanguage: z.string().nullable(),
    notificationPreferences: NotificationPreferencesSchema,
    /* Presentation only. Null means "follow the system default", which is how
       a user who never opens Preferences keeps behaving exactly as before. */
    timezone: z.string().nullable(),
    dateFormat: z.string().nullable(),
    numberFormat: z.string().nullable(),
    theme: z.string().nullable(),
  }),

  readOnly: z.object({
    employeeNumber: z.string().nullable(),
    staffId: z.string().nullable(),
    branch: z.string().nullable(),
    zone: z.string().nullable(),
    region: z.string().nullable(),
    role: z.string().nullable(),
    employmentStatus: z.string().nullable(),
    hiredAt: z.string().nullable(),
    baseSalary: z.number().nullable(),
    paymentMethod: z.string().nullable(),
    commissionEligible: z.boolean().nullable(),
    supervisor: z.string().nullable(),
    userStatus: z.string(),
    createdAt: z.string().nullable(),
    lastLoginAt: z.string().nullable(),
  }),

  permissions: z.array(z.string()),
});

export type Profile = z.infer<typeof ProfileSchema>;

/** Only these keys are ever sent; the API declares no rule for anything else. */
/** Security tab — assembled by the API from audit logs and Sanctum tokens. */
export const SessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
  current: z.boolean(),
});
export type Session = z.infer<typeof SessionSchema>;

export const SecuritySchema = z.object({
  passwordChangedAt: z.string().nullable(),
  lastLoginAt: z.string().nullable(),
  lastLoginIp: z.string().nullable(),
  lastFailedLoginAt: z.string().nullable(),
  lastFailedLoginIp: z.string().nullable(),
  sessions: z.array(SessionSchema),
  twoFactor: z.object({ enabled: z.boolean(), available: z.boolean() }),
});
export type Security = z.infer<typeof SecuritySchema>;

export const ActivityEntrySchema = z.object({
  id: z.string(),
  action: z.string(),
  auditableType: z.string(),
  auditableId: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  at: z.string(),
});
export type ActivityEntry = z.infer<typeof ActivityEntrySchema>;

export interface ProfileUpdate {
  phone?: string;
  email?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  nextOfKinName?: string | null;
  nextOfKinPhone?: string | null;
  nextOfKinRelationship?: string | null;
  preferredLanguage?: string | null;
  notificationPreferences?: NotificationPreferences;
  timezone?: string | null;
  dateFormat?: string | null;
  numberFormat?: string | null;
  theme?: string | null;
}
