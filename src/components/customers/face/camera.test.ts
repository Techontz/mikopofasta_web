import { describe, expect, it } from "vitest";

import { cameraConstraints, isMirrored, openedFacing, otherFacing, usableFacing } from "./camera";

describe("face scanner camera", () => {
  it("switches between the front and the back camera", () => {
    expect(otherFacing("user")).toBe("environment");
    expect(otherFacing("environment")).toBe("user");
  });

  it("asks for the chosen camera without failing on a device that lacks it", () => {
    const video = cameraConstraints("environment").video as MediaTrackConstraints;
    expect(video.facingMode).toEqual({ ideal: "environment" });
    expect(cameraConstraints("user").audio).toBe(false);
  });

  it("uses the back camera only on a device with more than one camera", () => {
    expect(usableFacing("environment", 2)).toBe("environment");
    expect(usableFacing("environment", 1)).toBe("user");
    expect(usableFacing("environment", 0)).toBe("user");
    expect(usableFacing("user", 3)).toBe("user");
  });

  it("trusts the camera the browser reports, else the one requested", () => {
    expect(openedFacing("environment", "user")).toBe("user");
    expect(openedFacing("user", "environment")).toBe("environment");
    expect(openedFacing("environment", undefined)).toBe("environment");
    expect(openedFacing("user", "")).toBe("user");
  });

  it("mirrors only the front camera's preview", () => {
    expect(isMirrored("user")).toBe(true);
    expect(isMirrored("environment")).toBe(false);
  });
});
