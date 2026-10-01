/**
 * Which camera the face scanner uses. "user" is the front (selfie) camera, "environment" the back camera — an officer
 * holding a phone or tablet can point the back camera at the customer. Both cameras see the customer's face the same
 * way, so the pose checks (turn left / right, looked from the customer's side) do not depend on the choice; only the
 * preview is mirrored for the front camera, like a mirror.
 */
export type CameraFacing = "user" | "environment";

const STORAGE_KEY = "mf.faceScanner.camera";

export const CAMERA_LABELS: Record<CameraFacing, string> = { user: "Front camera", environment: "Back camera" };

export function otherFacing(facing: CameraFacing): CameraFacing {
  return facing === "user" ? "environment" : "user";
}

/**
 * The camera request. `ideal` (not `exact`) so a machine with a single camera still opens it instead of failing.
 */
export function cameraConstraints(facing: CameraFacing): MediaStreamConstraints {
  return { video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
}

/**
 * The camera actually opened: what the browser reports for the track, or — when it reports nothing (most desktop
 * webcams) — what was asked for.
 */
export function openedFacing(requested: CameraFacing, reported: string | undefined): CameraFacing {
  return reported === "user" || reported === "environment" ? reported : requested;
}

/** Only the front camera's preview is mirrored. */
export function isMirrored(facing: CameraFacing): boolean {
  return facing === "user";
}

/** The camera to ask for: the back camera only when the device has more than one camera. */
export function usableFacing(preferred: CameraFacing, cameraCount: number): CameraFacing {
  return cameraCount > 1 ? preferred : "user";
}

export function savedFacing(): CameraFacing {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "environment" ? "environment" : "user";
  } catch {
    return "user";
  }
}

export function saveFacing(facing: CameraFacing): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, facing);
  } catch {
    // Storage blocked (private mode): the choice simply is not remembered.
  }
}

/** How many cameras the device has (0 when the browser cannot tell). */
export async function countCameras(): Promise<number> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === "videoinput").length;
  } catch {
    return 0;
  }
}
