import { POSE_SEQUENCE, type FaceChecks, type HeadPose } from "@/features/customers/registration-wizard/face-scanner/face-quality";

/**
 * The verification report a scan produces.
 *
 * The scanner used to hand back a JPEG. Everything it had measured to decide
 * that JPEG was worth keeping — the lighting, the focus, the distance, which
 * of the five head positions the customer actually completed — was computed,
 * used once, and dropped on the floor. The record then said "face verified"
 * and could not say on what evidence, which is the one thing a KYC record
 * exists to say.
 *
 * So the image now travels with its report, and the API stores both. Every
 * field here is a measurement or a fact about the capture. There is nothing
 * in this file that is not something the browser actually observed.
 */

/**
 * Bumped whenever a threshold in face-quality.ts moves.
 *
 * A verdict is only interpretable against the rules that reached it: "passed,
 * 88%" from a scanner that wanted a Laplacian variance of 12 is a different
 * claim from the same figures under a stricter one. Stored per scan so an old
 * record is never re-read under today's rules.
 */
export const SCANNER_VERSION = "mikopofasta-face-kyc@1.0.0";

/** Every check the report carries, in the order the API expects them. */
export const FACE_CHECK_NAMES = [
  "oneFaceDetected",
  "eyesOpen",
  "centered",
  "correctDistance",
  "goodLighting",
  "sharpImage",
  "poseStraight",
  "poseLeft",
  "poseRight",
  "poseUp",
  "poseDown",
] as const;

export type FaceCheckName = (typeof FACE_CHECK_NAMES)[number];

/** How each check reads on screen. */
export const FACE_CHECK_LABELS: Record<FaceCheckName, string> = {
  oneFaceDetected: "One face detected",
  eyesOpen: "Eyes open",
  centered: "Centred in frame",
  correctDistance: "Correct distance",
  goodLighting: "Good lighting",
  sharpImage: "Sharp image",
  poseStraight: "Straight pose",
  poseLeft: "Left pose",
  poseRight: "Right pose",
  poseUp: "Up pose",
  poseDown: "Down pose",
};

export interface FaceScanReport {
  status: "passed" | "failed";
  /** Overall confidence, 0–100. See `overallConfidence` below. */
  qualityScore: number;
  brightnessScore: number;
  blurScore: number;
  distanceScore: number;
  centeringScore: number;
  eyesOpenScore: number;
  scannerVersion: string;
  livenessPassed: boolean;
  poseSequenceCompleted: boolean;
  checks: Record<FaceCheckName, boolean>;
  /** The camera's own label, or null if the browser withheld it. */
  captureDevice: string | null;
  /** e.g. "1280x720", from the track's real settings. */
  captureResolution: string | null;
  captureDurationMs: number | null;
}

/** Which pose maps to which check name. */
const POSE_CHECK: Record<HeadPose, FaceCheckName> = {
  straight: "poseStraight",
  left: "poseLeft",
  right: "poseRight",
  up: "poseUp",
  down: "poseDown",
};

/**
 * One number for the profile to show beside a name.
 *
 * The mean of the five image measurements and the share of the pose sequence
 * the customer completed — six equally-weighted terms. Equal weighting is a
 * choice, and the defensible one: a beautifully lit photograph of somebody who
 * never turned their head is not a better verification than a slightly dim one
 * of somebody who completed all five positions, and weighting the pretty
 * picture higher would say it was.
 */
function overallConfidence(frame: FaceChecks, posesCompleted: number): number {
  const terms = [
    frame.brightnessScore,
    frame.blurScore,
    frame.distanceScore,
    frame.centeringScore,
    frame.eyesOpenScore,
    Math.round((posesCompleted / POSE_SEQUENCE.length) * 100),
  ];

  return Math.round(terms.reduce((sum, t) => sum + t, 0) / terms.length);
}

/**
 * Assembles the report from what the scan observed.
 *
 * `frame` is the evaluation of the frame that was actually kept — the straight
 * pose, which is the photograph the record ends up holding. Grading a
 * different frame would describe an image nobody will ever look at.
 *
 * A scan is `passed` only when every pose was completed. Stopping early
 * produces a `failed` report rather than no report at all: "this customer
 * could not complete a liveness check" is a fact worth recording, and the API
 * will not mark them verified on it.
 */
export function buildReport({
  frame,
  posesCompleted,
  device,
  resolution,
  durationMs,
}: {
  frame: FaceChecks;
  posesCompleted: HeadPose[];
  device: string | null;
  resolution: string | null;
  durationMs: number | null;
}): FaceScanReport {
  const done = new Set(posesCompleted);
  const complete = POSE_SEQUENCE.every((pose) => done.has(pose));

  const checks: Record<FaceCheckName, boolean> = {
    oneFaceDetected: frame.singleFace,
    eyesOpen: frame.eyesOpen,
    centered: frame.centered,
    correctDistance: frame.wellSized,
    goodLighting: frame.bright,
    sharpImage: frame.sharp,
    poseStraight: done.has("straight"),
    poseLeft: done.has("left"),
    poseRight: done.has("right"),
    poseUp: done.has("up"),
    poseDown: done.has("down"),
  };

  /* Liveness is the sequence, not the photograph. A printed face passes every
     image check and cannot turn, so the poses are the only part of this that
     a photograph of a photograph fails. */
  const livenessPassed = POSE_SEQUENCE.every((pose) => checks[POSE_CHECK[pose]]);

  return {
    status: complete && livenessPassed ? "passed" : "failed",
    qualityScore: overallConfidence(frame, done.size),
    brightnessScore: frame.brightnessScore,
    blurScore: frame.blurScore,
    distanceScore: frame.distanceScore,
    centeringScore: frame.centeringScore,
    eyesOpenScore: frame.eyesOpenScore,
    scannerVersion: SCANNER_VERSION,
    livenessPassed,
    poseSequenceCompleted: complete,
    checks,
    captureDevice: device,
    captureResolution: resolution,
    captureDurationMs: durationMs,
  };
}

/** The report as the multipart body the API validates. */
export function appendReport(form: FormData, report: FaceScanReport, reason?: string | null): FormData {
  form.append("status", report.status);
  form.append("qualityScore", String(report.qualityScore));
  form.append("brightnessScore", String(report.brightnessScore));
  form.append("blurScore", String(report.blurScore));
  form.append("distanceScore", String(report.distanceScore));
  form.append("centeringScore", String(report.centeringScore));
  form.append("eyesOpenScore", String(report.eyesOpenScore));
  form.append("scannerVersion", report.scannerVersion);
  form.append("livenessPassed", report.livenessPassed ? "1" : "0");
  form.append("poseSequenceCompleted", report.poseSequenceCompleted ? "1" : "0");

  /* Omitted rather than sent empty: the API's rule is `nullable`, and "" would
     be stored as a measurement of nothing. */
  if (report.captureDevice) form.append("captureDevice", report.captureDevice);
  if (report.captureResolution) form.append("captureResolution", report.captureResolution);
  if (report.captureDurationMs !== null) form.append("captureDurationMs", String(report.captureDurationMs));
  if (reason) form.append("reason", reason);

  for (const name of FACE_CHECK_NAMES) {
    form.append(`checks[${name}]`, report.checks[name] ? "1" : "0");
  }

  return form;
}
