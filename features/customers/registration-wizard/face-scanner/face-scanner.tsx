"use client";

import * as React from "react";
import { Camera, CheckCircle2, RefreshCw, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  POSE_PROMPT,
  POSE_SEQUENCE,
  evaluate,
  imageQuality,
  type FaceChecks,
  type HeadPose,
} from "@/features/customers/registration-wizard/face-scanner/face-quality";
import {
  buildReport,
  type FaceScanReport,
} from "@/features/customers/registration-wizard/face-scanner/face-report";

/**
 * The KYC face liveness scan.
 *
 * Replaces a file upload, and the difference is the point: a photograph can be
 * a photograph of a photograph. Asking the customer to turn their head through
 * five positions while a landmarker tracks them is what makes this a liveness
 * check rather than a picture — a printed face does not turn, and a face on a
 * phone screen fails the depth the transformation matrix reports.
 *
 * Runs entirely in the browser against a self-hosted model. Nothing is uploaded
 * during the scan and no third party sees the customer's face: the WASM runtime
 * and the 3.6 MB landmarker live in `public/mediapipe`, not on Google's CDN, so
 * this works in a branch with no internet and sends biometric data nowhere.
 *
 * Only the frame captured at "look straight" is kept. The other four positions
 * are proof of liveness, not photographs to store — a KYC record needs one
 * usable portrait, and keeping five images of somebody's face because the
 * software happened to see them would be collecting more than the job needs.
 *
 * What the scan produces is an image AND a report: the graded measurements of
 * the frame that was kept, which head positions were completed, the camera and
 * resolution they were taken on, and how long it took. See face-report.ts.
 */

const WASM_PATH = "/mediapipe/wasm";
const MODEL_PATH = "/mediapipe/models/face_landmarker.task";
/** Frames a pose must hold before it counts — stops a wobble scoring a pass. */
const HOLD_FRAMES = 6;
/**
 * Consecutive detectForVideo failures tolerated before the scan is declared
 * broken. A single frame can fail transiently — the GPU context is lost, the
 * element is mid-resize — and retrying costs 16ms. A sustained run means the
 * pipeline is gone, and pretending otherwise leaves the officer watching a
 * dead preview.
 */
const MAX_DETECT_FAILURES = 30;

/**
 * A clock reading, at module scope.
 *
 * The scan's duration is one of the things the report has to state, and
 * measuring it means reading a clock. The React Compiler's purity rule
 * rejects a clock read inside a function it might run during a render — which
 * is correct in general and irrelevant here, since the two call sites are an
 * event handler and a callback. Keeping the read out here satisfies the rule
 * without pretending the duration is unmeasurable.
 *
 * Wall clock rather than performance.now(): the figure reported is whole
 * milliseconds, where the difference between the two does not exist.
 */
const clock = () => Date.now();

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "scanning" }
  | { kind: "done" }
  | { kind: "failed"; reason: string };

export function FaceScanner({
  capture,
  report,
  onCapture,
  onClear,
  disabled,
  /** Offer "stop and record a failed scan" — see `finish` for why. */
  allowFailedResult = false,
}: {
  capture: File | null;
  /** The report for `capture`, when there is one. */
  report?: FaceScanReport | null;
  onCapture: (file: File, report: FaceScanReport) => void;
  onClear: () => void;
  disabled?: boolean;
  allowFailedResult?: boolean;
}) {
  const [phase, setPhase] = React.useState<Phase>({ kind: "idle" });
  const [stepIndex, setStepIndex] = React.useState(0);
  const [checks, setChecks] = React.useState<FaceChecks | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const landmarkerRef = React.useRef<import("@mediapipe/tasks-vision").FaceLandmarker | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const holdRef = React.useRef(0);
  /* Read inside the animation frame, which closes over its first render. */
  const stepRef = React.useRef(0);

  /* What the report is assembled from. All refs: the frame loop writes them
     many times a second and none of it belongs in render. */
  const posesRef = React.useRef<HeadPose[]>([]);
  /** The evaluation of the frame that was kept — the graded portrait. */
  const keptFrameRef = React.useRef<FaceChecks | null>(null);
  const keptFileRef = React.useRef<File | null>(null);
  const startedAtRef = React.useRef<number | null>(null);
  const deviceRef = React.useRef<string | null>(null);
  const resolutionRef = React.useRef<string | null>(null);
  /* The frame loop lives in a ref, not in render scope: it calls
     performance.now() and createElement per frame, which the React Compiler
     correctly refuses to allow in a function it might run during a render. */
  const loopRef = React.useRef<() => void>(() => {});

  const preview = React.useMemo(() => (capture ? URL.createObjectURL(capture) : null), [capture]);
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  /*
   * Which scan is current.
   *
   * Bumped by every stop, and captured by the frame loop when it is built. The
   * loop refuses to schedule another frame once its own generation is stale.
   *
   * Without it there is a use-after-free: the portrait is grabbed through
   * `grab().then(...)`, and if the officer cancels — or the dialog unmounts —
   * while that promise is in flight, the continuation still calls
   * requestAnimationFrame. The next frame then reaches detectForVideo on a
   * landmarker that stop() has already close()d, inside a promise chain with
   * nothing to catch it.
   */
  const runRef = React.useRef(0);
  /** Consecutive detectForVideo failures; reset by the first good frame. */
  const detectFailuresRef = React.useRef(0);

  const stop = React.useCallback(() => {
    runRef.current += 1;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
  }, []);

  // The camera light goes out when this unmounts, not whenever GC gets round to it.
  React.useEffect(() => stop, [stop]);

  /** Grabs the current frame as a JPEG — used once, at the end of the scan. */
  function grab(): Promise<File | null> {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return Promise.resolve(null);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    return new Promise((resolve) =>
      canvas.toBlob(
        (blob) =>
          resolve(blob ? new File([blob], `kyc-face-${Date.now()}.jpg`, { type: "image/jpeg" }) : null),
        "image/jpeg",
        0.92
      )
    );
  }

  /**
   * Ends the scan and emits the report.
   *
   * Called both when the sequence completes and when the officer stops early.
   * The difference is not in this function — `buildReport` decides pass or
   * fail from which poses were actually completed, so an abandoned scan
   * produces an honest failed record rather than nothing at all. The API
   * refuses to mark a customer verified on a failed one, which is what makes
   * offering the button safe.
   */
  const finish = React.useCallback(() => {
    stop();

    const file = keptFileRef.current;
    const frame = keptFrameRef.current;

    /* No portrait was ever taken, so there is nothing to report on. */
    if (!file || !frame) {
      setPhase({ kind: "idle" });
      return;
    }

    const built = buildReport({
      frame,
      posesCompleted: posesRef.current,
      device: deviceRef.current,
      resolution: resolutionRef.current,
      durationMs: startedAtRef.current === null ? null : clock() - startedAtRef.current,
    });

    onCapture(file, built);
    setPhase({ kind: "done" });
  }, [onCapture, stop]);

  async function start() {
    setPhase({ kind: "loading" });
    setStepIndex(0);
    stepRef.current = 0;
    holdRef.current = 0;
    posesRef.current = [];
    keptFrameRef.current = null;
    keptFileRef.current = null;
    deviceRef.current = null;
    resolutionRef.current = null;
    startedAtRef.current = clock();
    detectFailuresRef.current = 0;

    try {
      /*
       * Imported here rather than at module scope so the ~1 MB of glue code is
       * fetched when somebody actually scans a face, not on every page that
       * happens to render this component.
       */
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);

      landmarkerRef.current = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
        runningMode: "VIDEO",
        /* Two, so a second face is DETECTED and rejected. Asking for one would
           silently pick whichever the model preferred and never notice. */
        numFaces: 2,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      /*
       * What the picture was actually taken on, read off the track rather
       * than from the constraints we asked for — `ideal: 1280` is a request,
       * and a laptop webcam may well have given 640. Recording the request
       * would be recording a wish.
       *
       * The label is empty until camera permission is granted, and stays
       * empty in some privacy modes. Null in that case; a placeholder would
       * be a fact we do not have.
       */
      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings();
      deviceRef.current = track?.label?.trim() ? track.label.trim().slice(0, 191) : null;
      resolutionRef.current =
        settings?.width && settings?.height ? `${settings.width}x${settings.height}` : null;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }

      setPhase({ kind: "scanning" });
      loopRef.current = makeLoop();
      loopRef.current();
    } catch (error) {
      stop();
      setPhase({ kind: "failed", reason: explain(error) });
    }
  }

  /**
   * Builds the per-frame loop. Called from `start`, never during a render.
   *
   * One pass per animation frame: detect, score, advance or reset the hold.
   *
   * The quality figures are computed on a 160-wide copy — brightness and
   * blur do not need the detail, and doing it at 1280 would drop the frame
   * rate far enough to make the preview feel broken.
   */
  function makeLoop() {
    /* This loop belongs to this scan. Any stop() invalidates it. */
    const run = runRef.current;
    /** Schedules the next frame, unless this scan is over. */
    const next = (fn: () => void) => {
      if (runRef.current !== run) return;
      rafRef.current = requestAnimationFrame(fn);
    };

    const loop = () => {
    if (runRef.current !== run) return;

    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    const track = streamRef.current?.getVideoTracks()[0];

    /*
     * Wait for the pipeline to be genuinely ready rather than calling into it
     * and hoping.
     *
     * `videoWidth > 0` was the whole guard, and it is not enough: dimensions
     * are known at HAVE_METADATA (readyState 1), while detectForVideo needs a
     * decoded frame — HAVE_CURRENT_DATA (2) or better. The gap between the two
     * is small and real, and it is exactly the window a scan starts in.
     *
     * `track.readyState` covers the other end: a camera unplugged or revoked
     * mid-scan leaves the element's dimensions intact while frames stop
     * arriving, so size alone would say everything is fine forever.
     */
    const ready =
      video !== null &&
      landmarker !== null &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.videoWidth > 0 &&
      video.videoHeight > 0 &&
      track?.readyState === "live";

    if (!ready) {
      next(loop);
      return;
    }

    /*
     * The one call that talks to WASM, and the only thing wrapped.
     *
     * A throw here used to end the scan silently: control left the function
     * before the requestAnimationFrame at the bottom, so the loop simply
     * stopped. The camera stayed on, the oval stayed grey, and the officer was
     * left looking at "Position your face in the oval" forever with nothing
     * reported. One bad frame is survivable and is retried; a run of them is
     * not, and is surfaced rather than swallowed.
     */
    let result;
    try {
      result = landmarker.detectForVideo(video, performance.now());
      detectFailuresRef.current = 0;
    } catch (error) {
      detectFailuresRef.current += 1;
      // The real exception, unedited — never a summary of it.
      console.error(
        `Face scanner: detectForVideo failed (${detectFailuresRef.current}/${MAX_DETECT_FAILURES})`,
        error
      );

      if (detectFailuresRef.current >= MAX_DETECT_FAILURES) {
        stop();
        setPhase({
          kind: "failed",
          reason:
            "The face scanner stopped responding. Close this and try again; if it keeps happening, restart the browser.",
        });
        return;
      }

      next(loop);
      return;
    }

    const small = document.createElement("canvas");
    small.width = 160;
    small.height = Math.round((video.videoHeight / video.videoWidth) * 160);
    small.getContext("2d")?.drawImage(video, 0, 0, small.width, small.height);

    const want = POSE_SEQUENCE[stepRef.current];
    const verdict = evaluate(result, want, imageQuality(small));
    setChecks(verdict);

    if (verdict.passes) {
      holdRef.current += 1;

      if (holdRef.current >= HOLD_FRAMES) {
        holdRef.current = 0;

        /* This position is now proven. Recorded before anything async, so a
           report built from an early stop cannot miss the pose that just
           passed. */
        if (!posesRef.current.includes(want)) posesRef.current.push(want);

        /*
         * The portrait is taken on the first pose, while the customer is
         * looking at the camera. The remaining four prove they are a live
         * person and are not kept.
         */
        const isFirst = stepRef.current === 0;
        const nextStep = stepRef.current + 1;

        const advance = () => {
          /* The scan may have been stopped while grab() was in flight. */
          if (runRef.current !== run) return;
          if (nextStep >= POSE_SEQUENCE.length) {
            finish();
            return;
          }
          stepRef.current = nextStep;
          setStepIndex(nextStep);
          next(loop);
        };

        if (isFirst) {
          /* The grading travels with the image: these are the measurements of
             the frame the record will actually hold, not of whichever frame
             happened to be on screen when the scan ended. */
          keptFrameRef.current = verdict;
          void grab().then((file) => {
            keptFileRef.current = file;
            advance();
          });
          return;
        }
        advance();
        return;
      }
    } else {
      holdRef.current = 0;
    }

    next(loop);
    };
    return loop;
  }

  /* ------------------------------------------------------------- captured */

  if (capture && phase.kind !== "scanning") {
    const failed = report?.status === "failed";

    return (
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
        <img
          src={preview ?? ""}
          alt={failed ? "Face capture — liveness not confirmed" : "Verified face capture"}
          className="size-32 rounded-md border object-cover"
        />
        <div className="space-y-2">
          {/* The result is reported as it was, not as it was hoped. A scan
              that did not confirm liveness says so here and is recorded that
              way — the API will not mark the customer verified on it. */}
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {failed ? (
              <ShieldAlert className="size-4 text-amber-600" aria-hidden />
            ) : (
              <ShieldCheck className="size-4 text-emerald-600" aria-hidden />
            )}
            {failed ? "Liveness not confirmed" : "Liveness verified"}
            {report && (
              <span className="font-normal text-muted-foreground">— quality {report.qualityScore}%</span>
            )}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {failed
              ? "The customer did not complete all five head positions. The capture is kept and recorded as a failed scan."
              : "Five head positions confirmed on a live camera. Stored as the customer’s profile photo."}
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={start} disabled={disabled}>
              <RefreshCw className="size-3.5" />
              Rescan
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onClear} disabled={disabled}>
              <X className="size-3.5" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- scanner */

  const scanning = phase.kind === "scanning";

  return (
    <div className="space-y-3">
      <div className={scanning ? "space-y-3" : "hidden"}>
        <div className="relative w-full max-w-[340px]">
          <video
            ref={videoRef}
            playsInline
            muted
            aria-label="Face scanner preview"
            className="aspect-[3/4] w-full rounded-lg border bg-black object-cover"
          />

          {/* The oval the customer aligns to. Turns green when every check on
              the current pose passes, which is the only feedback most people
              actually read. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div
              className="h-[72%] w-[58%] rounded-[50%] border-4 transition-colors"
              style={{
                borderColor: checks?.passes
                  ? "rgb(16 185 129)"
                  : checks?.faceCount === 1
                    ? "rgba(255,255,255,.75)"
                    : "rgba(239,68,68,.85)",
              }}
            />
          </div>

          <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/65 px-3 py-2 text-center">
            <p className="text-[13px] font-medium text-white">
              {checks?.hint ?? POSE_PROMPT[POSE_SEQUENCE[stepIndex]]}
            </p>
          </div>
        </div>

        {/* Progress — the five positions, and which are done. */}
        <div className="max-w-[340px] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              Step {Math.min(stepIndex + 1, POSE_SEQUENCE.length)}/{POSE_SEQUENCE.length}
            </span>
            <span className="text-muted-foreground">Quality {checks?.score ?? 0}%</span>
          </div>
          <div className="flex gap-1">
            {POSE_SEQUENCE.map((pose, i) => (
              <div
                key={pose}
                title={POSE_PROMPT[pose]}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{
                  background:
                    i < stepIndex
                      ? "rgb(16 185 129)"
                      : i === stepIndex
                        ? "rgb(59 130 246)"
                        : "rgb(228 228 231)",
                }}
              />
            ))}
          </div>

          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
            <Check ok={checks?.singleFace} label="One face only" />
            <Check ok={checks?.wellSized} label="Distance" />
            <Check ok={checks?.centered} label="Centred" />
            <Check ok={checks?.eyesOpen} label="Eyes open" />
            <Check ok={checks?.bright} label="Lighting" />
            <Check ok={checks?.sharp} label="Sharpness" />
          </ul>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                stop();
                setPhase({ kind: "idle" });
              }}
            >
              Cancel scan
            </Button>

            {/*
              Recording a scan that did not complete.

              Offered on the profile, not during registration: a customer who
              cannot turn their head is a real case that a branch has to be
              able to write down, and refusing to record it just means the
              officer uploads nothing and the record stays silent. It is not a
              way round the check — the report says `failed`, the API leaves
              `face_verified_at` null, and KYC stays incomplete.
            */}
            {allowFailedResult && stepIndex > 0 && (
              <Button type="button" size="sm" variant="outline" onClick={finish}>
                Stop and record as failed
              </Button>
            )}
          </div>
        </div>
      </div>

      {!scanning && (
        <div className="space-y-2">
          {phase.kind === "failed" && (
            <p role="alert" className="max-w-sm text-xs text-destructive">
              {phase.reason}
            </p>
          )}
          <p className="max-w-sm text-xs text-muted-foreground">
            The customer will be asked to look straight ahead, then turn left, right, up and down.
            The photo is taken automatically once every check passes.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={start}
            disabled={disabled || phase.kind === "loading"}
          >
            <Camera className="size-3.5" />
            {phase.kind === "loading"
              ? "Starting scanner…"
              : phase.kind === "failed"
                ? "Try again"
                : "Start face scan"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Check({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <li className={ok ? "flex items-center gap-1 text-emerald-600" : "flex items-center gap-1 text-muted-foreground"}>
      <CheckCircle2 className="size-3" aria-hidden />
      {label}
    </li>
  );
}

/** getUserMedia and model-load failures, in words a branch officer can act on. */
function explain(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Allow the camera for this site in your browser's address bar, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device.";
    case "NotReadableError":
      return "The camera is already in use by another application. Close it and try again.";
    default:
      return "The face scanner could not start. Check the camera and try again.";
  }
}
