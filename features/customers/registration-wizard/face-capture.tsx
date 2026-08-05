"use client";

import * as React from "react";
import { Camera, RefreshCw, ShieldCheck, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The KYC liveness capture.
 *
 * WHAT THIS REPLACED. The step used to "verify" a face with
 * `setTimeout(800)` followed by stamping `faceVerifiedAt` from the browser
 * clock. No camera, no image, no request — and the backend *requires* that
 * timestamp ("Face verification must be completed before registration"), so
 * every customer registered through the wizard carried a verification for a
 * check that never happened. That is a compliance control defeated by its own
 * user interface.
 *
 * WHAT IT DOES NOW. Opens the webcam, shows a live preview, and grabs a frame
 * to a JPEG that the wizard posts to `POST /customers/{id}/face-verify` as soon
 * as the customer exists. The timestamp is only ever set beside a real file.
 *
 * PERMISSION IS NOT ASSUMED. A camera can be denied, absent, or already in use
 * by another tab, and on a desktop workstation in a branch office it very often
 * is. Each of those is reported for what it is, with a retry, and with a file
 * upload alongside — because a branch that scans passport photos at a shared
 * desk still has to be able to register a customer.
 */

type Phase =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "live" }
  | { kind: "denied"; reason: string };

/** Turns a getUserMedia rejection into something a branch officer can act on. */
function explain(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Allow the camera for this site in your browser's address bar, then try again — or upload a photo instead.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device. Upload a photo instead.";
    case "NotReadableError":
      return "The camera is already in use by another application. Close it and try again, or upload a photo instead.";
    default:
      return "The camera could not be started. Try again, or upload a photo instead.";
  }
}

export function FaceCapture({
  capture,
  onCapture,
  onClear,
  disabled,
}: {
  capture: File | null;
  onCapture: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [phase, setPhase] = React.useState<Phase>({ kind: "idle" });
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // A preview of whatever is currently attached, revoked when it is replaced —
  // object URLs are not garbage collected on their own.
  const previewUrl = React.useMemo(() => (capture ? URL.createObjectURL(capture) : null), [capture]);
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const stop = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // The camera light must go out when this unmounts, not whenever the browser
  // gets round to it.
  React.useEffect(() => stop, [stop]);

  async function start() {
    setPhase({ kind: "starting" });
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("unsupported", "NotFoundError");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        // `user` is the front camera on a phone; ignored on a desktop webcam.
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPhase({ kind: "live" });
    } catch (error) {
      stop();
      setPhase({ kind: "denied", reason: explain(error) });
    }
  }

  function shoot() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `liveness-${Date.now()}.jpg`, { type: "image/jpeg" }));
        stop();
        setPhase({ kind: "idle" });
      },
      "image/jpeg",
      0.9
    );
  }

  /* ------------------------------------------------------------- attached */

  if (capture) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL */}
          <img
            src={previewUrl ?? ""}
            alt="Liveness capture preview"
            className="size-20 rounded-md border object-cover"
          />
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <ShieldCheck className="size-4 text-emerald-600" aria-hidden />
              Capture attached
            </p>
            <p className="text-xs text-muted-foreground">
              Checked against the customer record when registration is submitted.
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={onClear} disabled={disabled}>
                <RefreshCw className="size-3.5" />
                Retake
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onClear} disabled={disabled}>
                <X className="size-3.5" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------------- live */

  return (
    <div className="space-y-2">
      <div className={phase.kind === "live" ? "space-y-2" : "hidden"}>
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Camera preview"
          className="aspect-[4/3] w-full max-w-[280px] rounded-md border bg-black object-cover"
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={shoot} disabled={disabled}>
            <Camera className="size-3.5" />
            Capture
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              stop();
              setPhase({ kind: "idle" });
            }}
          >
            Cancel
          </Button>
        </div>
      </div>

      {phase.kind !== "live" && (
        <div className="space-y-2">
          {phase.kind === "denied" && (
            <p role="alert" className="max-w-sm text-xs text-destructive">
              {phase.reason}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={start}
              disabled={disabled || phase.kind === "starting"}
            >
              <Camera className="size-3.5" />
              {phase.kind === "starting"
                ? "Starting camera…"
                : phase.kind === "denied"
                  ? "Try camera again"
                  : "Open camera"}
            </Button>
            {/* Always offered, not only after a failure: a shared branch
                workstation may have no camera at all, and making the officer
                trip over an error first to discover the alternative is a worse
                first experience than simply showing both. */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => fileRef.current?.click()}
              disabled={disabled}
            >
              <Upload className="size-3.5" />
              Upload a photo
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        aria-label="Face capture"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // let the same file be re-picked after a mistake
          if (file && file.type.startsWith("image/")) onCapture(file);
        }}
      />
    </div>
  );
}
