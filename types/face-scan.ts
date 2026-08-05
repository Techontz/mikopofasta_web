import { z } from "zod";
import { FACE_CHECK_NAMES } from "@/features/customers/registration-wizard/face-scanner/face-report";

/**
 * A recorded face verification — `GET /customers/{id}/face-scans`.
 *
 * Mirrors FaceScanResource on the API. Scans are immutable and never
 * overwritten: a re-scan adds a row and moves `isActive`, so this type
 * describes both the current verification and every one it superseded.
 *
 * `imageUrl` is a signed, expiring link. It is not a path and cannot be
 * stored or shared usefully — it stops working within minutes, which is the
 * point when the thing behind it is a photograph of somebody's face.
 */

export const FACE_SCAN_STATUSES = ["passed", "failed"] as const;
export type FaceScanStatus = (typeof FACE_SCAN_STATUSES)[number];

/** Every check the report carries, all keys always present. */
const ChecksSchema = z.object(
  Object.fromEntries(FACE_CHECK_NAMES.map((name) => [name, z.boolean()])) as Record<
    (typeof FACE_CHECK_NAMES)[number],
    z.ZodBoolean
  >
);

export const FaceScanSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  status: z.enum(FACE_SCAN_STATUSES),

  qualityScore: z.number(),
  brightnessScore: z.number(),
  blurScore: z.number(),
  distanceScore: z.number(),
  centeringScore: z.number(),
  eyesOpenScore: z.number(),

  scannerVersion: z.string(),
  livenessPassed: z.boolean(),
  poseSequenceCompleted: z.boolean(),
  checks: ChecksSchema,

  captureDevice: z.string().nullable(),
  captureResolution: z.string().nullable(),
  captureDurationMs: z.number().nullable(),

  reason: z.string().nullable(),

  scannedById: z.string().nullable(),
  scannedByName: z.string().nullable().optional(),
  scannedAt: z.string(),

  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),

  isActive: z.boolean(),
  imageUrl: z.string(),
});

export type FaceScan = z.infer<typeof FaceScanSchema>;

/** The export behind "Download Audit". */
export const FaceScanAuditSchema = z.object({
  customer: z.object({
    id: z.string(),
    customerNumber: z.string(),
    fullName: z.string(),
  }),
  scan: FaceScanSchema,
  auditTrail: z.array(
    z.object({
      id: z.string(),
      action: z.string(),
      operator: z.string().nullable(),
      ipAddress: z.string().nullable(),
      userAgent: z.string().nullable(),
      before: z.record(z.string(), z.unknown()).nullable(),
      after: z.record(z.string(), z.unknown()).nullable(),
      at: z.string(),
    })
  ),
  generatedAt: z.string(),
  generatedBy: z.string(),
});

export type FaceScanAudit = z.infer<typeof FaceScanAuditSchema>;
