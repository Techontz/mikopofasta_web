import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

/**
 * Turning MediaPipe's raw output into the checks a KYC capture has to pass.
 *
 * The landmarker gives 478 points, a set of blendshape scores and a 4×4
 * transformation matrix per face. None of that is a decision — this file is
 * where "is the head turned far enough left" and "is this too blurry to keep"
 * are actually answered, so the component can stay about presentation.
 *
 * Every threshold here is a judgement about a photograph a loan officer will
 * later be asked to recognise a person from. They are deliberately not strict
 * enough to fail a normal person in normal branch lighting: a scanner that
 * rejects honest customers gets switched off.
 */

export type HeadPose = "straight" | "left" | "right" | "up" | "down";

export interface FaceChecks {
  faceCount: number;
  /** Every check below passed and the pose matches what was asked for. */
  passes: boolean;
  singleFace: boolean;
  centered: boolean;
  /** Close enough to fill the frame, not so close it is cropped. */
  wellSized: boolean;
  eyesOpen: boolean;
  bright: boolean;
  sharp: boolean;
  poseMatches: boolean;
  /** Degrees. Positive yaw = turned to the subject's left. */
  yaw: number;
  pitch: number;
  /** 0–100, for the on-screen indicator. */
  score: number;
  /**
   * The graded measurements behind the booleans above, 0–100.
   *
   * The booleans answer "may this frame be kept". These answer "how good was
   * it", which is the question the profile asks a year later and which a pass
   * flag cannot. A frame that scrapes past every threshold and one taken in
   * good light at arm's length are both `passes: true`; only these tell them
   * apart, and only these are worth storing.
   */
  brightnessScore: number;
  blurScore: number;
  distanceScore: number;
  centeringScore: number;
  eyesOpenScore: number;
  /** The first thing standing in the way, for the instruction line. */
  hint: string;
}

/* ------------------------------------------------------------- thresholds */

/** The head must turn this far for a direction to count. */
const YAW_TARGET = 18;
const PITCH_TARGET = 14;
/** ...and stay within this of centre when "straight" is asked for. */
const STRAIGHT_TOLERANCE = 10;

/** Face box as a fraction of frame height. Too small = too far away. */
const MIN_FACE_HEIGHT = 0.28;
const MAX_FACE_HEIGHT = 0.85;
/** How far the face centre may sit from the frame centre, as a fraction. */
const MAX_OFFSET = 0.16;

/** Blendshape score above which an eye counts as shut. */
const BLINK_LIMIT = 0.5;
/** Mean luminance, 0–255. Below is too dark to identify anyone. */
const MIN_BRIGHTNESS = 55;
const MAX_BRIGHTNESS = 235;
/** Variance of the Laplacian. Low variance means no edges, i.e. blur. */
const MIN_SHARPNESS = 12;

/* ------------------------------------------------------------ grading

   The thresholds above are gates: pass or fail. These turn the same
   measurements into a 0–100 figure, because "verified" on a KYC record is
   worth very little without "how well".

   Both curves are deliberately harsh at the threshold. A frame that only just
   clears MIN_SHARPNESS is a usable photograph and a poor one, and a score of
   30 says so; giving it 100 for clearing the bar would make the number
   meaningless — which is the state the record was in when it stored no number
   at all. The anchors are where a normal capture in a lit branch office
   actually lands, not round figures.
*/

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 0 at `zero`, 100 at `full`, linear between. Works in either direction. */
function ramp(value: number, zero: number, full: number): number {
  return Math.round(100 * clamp01((value - zero) / (full - zero)));
}

/** 100 across [lo, hi], falling linearly to 0 at `floor` and `ceiling`. */
function band(value: number, floor: number, lo: number, hi: number, ceiling: number): number {
  if (value < lo) return ramp(value, floor, lo);
  if (value > hi) return ramp(value, ceiling, hi);
  return 100;
}

/** Full marks in normal indoor light; zero in the dark or blown out. */
const brightnessScore = (b: number) => band(b, 20, 95, 190, 250);
/** Laplacian variance. 12 is the pass mark and scores ~30 for that reason. */
const blurScore = (s: number) => ramp(s, 6, 28);
/** Face height as a fraction of the frame — too far and too close both cost. */
const distanceScore = (h: number) => band(h, 0.12, 0.38, 0.62, 0.9);
/** Offset of the face centre from the frame centre. */
const centeringScore = (offset: number) => ramp(offset, 0.4, 0);
/** 1 − the stronger blink blendshape. Half-lidded scores low, as it should. */
const eyesOpenScore = (openness: number) => ramp(openness, 0.3, 0.9);

/**
 * Yaw and pitch, in degrees, from the facial transformation matrix.
 *
 * MediaPipe returns column-major 4×4. Extracting Euler angles from the
 * rotation sub-matrix is standard; the clamp guards the gimbal case where
 * floating point pushes the argument of asin outside [-1, 1] and yields NaN,
 * which would silently disable the pose check rather than fail it.
 */
export function poseFromMatrix(matrix: number[]): { yaw: number; pitch: number } {
  const m = matrix;
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  const yaw = Math.asin(clamp(-m[8])) * (180 / Math.PI);
  const pitch = Math.atan2(m[9], m[10]) * (180 / Math.PI);
  return { yaw, pitch };
}

/**
 * Mean luminance and a Laplacian-variance sharpness figure.
 *
 * Both are computed on a downscaled greyscale copy — full resolution would
 * cost more per frame than it buys, and neither measure needs the detail.
 * Sampling every 4th pixel for brightness is plenty for a mean.
 */
export function imageQuality(canvas: HTMLCanvasElement): { brightness: number; sharpness: number } {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { brightness: 0, sharpness: 0 };

  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;

  const grey = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Rec. 601 luma — the usual weighting for perceived brightness.
    const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    grey[p] = v;
    sum += v;
  }
  const brightness = sum / (w * h);

  /*
   * Variance of the 4-neighbour Laplacian. A sharp image has strong edges and
   * therefore a wide spread of second-derivative values; a blurred one does
   * not. Borders are skipped rather than padded — an edge artefact would
   * inflate the variance and pass a blurred frame.
   */
  let mean = 0;
  let count = 0;
  const lap = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = 4 * grey[i] - grey[i - 1] - grey[i + 1] - grey[i - w] - grey[i + w];
      lap[i] = v;
      mean += v;
      count++;
    }
  }
  mean /= count || 1;

  let variance = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const d = lap[y * w + x] - mean;
      variance += d * d;
    }
  }

  return { brightness, sharpness: Math.sqrt(variance / (count || 1)) };
}

/**
 * Every check, for one frame, against one requested pose.
 *
 * `hint` names the single most useful thing to fix rather than listing all
 * failures: somebody standing too far away in the dark is told to come closer
 * first, and the lighting complaint arrives only once that no longer matters.
 */
export function evaluate(
  result: FaceLandmarkerResult,
  want: HeadPose,
  quality: { brightness: number; sharpness: number }
): FaceChecks {
  const faceCount = result.faceLandmarks?.length ?? 0;

  const base: FaceChecks = {
    faceCount,
    passes: false,
    singleFace: faceCount === 1,
    centered: false,
    wellSized: false,
    eyesOpen: false,
    bright: false,
    sharp: false,
    poseMatches: false,
    yaw: 0,
    pitch: 0,
    score: 0,
    /* Nothing was measured, so nothing is claimed. Zero here means "no face
       to grade", not "a face that graded badly" — the caller only ever stores
       the scores from a frame it kept. */
    brightnessScore: 0,
    blurScore: 0,
    distanceScore: 0,
    centeringScore: 0,
    eyesOpenScore: 0,
    hint: "Position your face in the oval",
  };

  if (faceCount === 0) return base;
  if (faceCount > 1) {
    return { ...base, hint: "More than one face is visible — only the customer should be in frame" };
  }

  const points = result.faceLandmarks[0];
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const faceHeight = maxY - minY;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const offset = Math.hypot(cx - 0.5, cy - 0.5);

  const wellSized = faceHeight >= MIN_FACE_HEIGHT && faceHeight <= MAX_FACE_HEIGHT;
  const centered = offset <= MAX_OFFSET;

  /* Blendshapes are named; index order is not guaranteed, so look them up. */
  const shapes = result.faceBlendshapes?.[0]?.categories ?? [];
  const shape = (name: string) => shapes.find((c) => c.categoryName === name)?.score ?? 0;
  const blink = Math.max(shape("eyeBlinkLeft"), shape("eyeBlinkRight"));
  const eyesOpen = blink < BLINK_LIMIT;

  const matrix = result.facialTransformationMatrixes?.[0]?.data;
  const { yaw, pitch } = matrix ? poseFromMatrix(Array.from(matrix)) : { yaw: 0, pitch: 0 };

  const poseMatches =
    want === "straight"
      ? Math.abs(yaw) <= STRAIGHT_TOLERANCE && Math.abs(pitch) <= STRAIGHT_TOLERANCE
      : want === "left"
        ? yaw >= YAW_TARGET
        : want === "right"
          ? yaw <= -YAW_TARGET
          : want === "up"
            ? pitch >= PITCH_TARGET
            : pitch <= -PITCH_TARGET;

  const bright = quality.brightness >= MIN_BRIGHTNESS && quality.brightness <= MAX_BRIGHTNESS;
  const sharp = quality.sharpness >= MIN_SHARPNESS;

  const checks = { singleFace: true, wellSized, centered, eyesOpen, bright, sharp, poseMatches };
  const passed = Object.values(checks).filter(Boolean).length;
  const score = Math.round((passed / Object.keys(checks).length) * 100);

  /* Ordered by what blocks the others: distance, then framing, then light,
     then focus, then the eyes, and only then the pose being asked for. */
  const hint = !wellSized
    ? faceHeight < MIN_FACE_HEIGHT
      ? "Move closer to the camera"
      : "Move back a little"
    : !centered
      ? "Centre your face in the oval"
      : !bright
        ? quality.brightness < MIN_BRIGHTNESS
          ? "Too dark — find better lighting"
          : "Too bright — move away from the light"
        : !sharp
          ? "Hold still — the image is blurry"
          : !eyesOpen
            ? "Keep both eyes open"
            : !poseMatches
              ? POSE_PROMPT[want]
              : "Hold still…";

  return {
    ...base,
    ...checks,
    yaw,
    pitch,
    score,
    brightnessScore: brightnessScore(quality.brightness),
    blurScore: blurScore(quality.sharpness),
    distanceScore: distanceScore(faceHeight),
    centeringScore: centeringScore(offset),
    eyesOpenScore: eyesOpenScore(1 - blink),
    passes: Object.values(checks).every(Boolean),
    hint,
  };
}

export const POSE_PROMPT: Record<HeadPose, string> = {
  straight: "Look straight at the camera",
  left: "Slowly turn your head to the left",
  right: "Slowly turn your head to the right",
  up: "Tilt your head up",
  down: "Tilt your head down",
};

export const POSE_SEQUENCE: HeadPose[] = ["straight", "left", "right", "up", "down"];
