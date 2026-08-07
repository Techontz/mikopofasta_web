"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import {
  changePasswordRequest,
  getProfile,
  removeProfilePhotoRequest,
  revokeOtherSessionsRequest,
  updateProfilePhotoRequest,
  updateProfileRequest,
} from "@/lib/api/auth";
import { ApiError, describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";
import type { Profile, ProfileUpdate } from "@/types/profile";

/**
 * Self-service profile — the write half.
 *
 * Every function here calls an endpoint that acts on the token's owner and
 * takes no user id, so none of them can be pointed at somebody else's record.
 * Nothing in this file touches role, branch, permissions, salary or employment
 * status; the API declares no rule for those keys, so they would be dropped
 * even if a caller sent them.
 */

/**
 * The keys a profile form may submit.
 *
 * Repeated here rather than trusted from the caller: this runs on the server,
 * and an action is a public entry point like any other endpoint. Building the
 * payload by walking a fixed list means a field added to the form by mistake
 * cannot reach the API.
 */
const EDITABLE = [
  "phone",
  "email",
  "address",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelationship",
  "nextOfKinName",
  "nextOfKinPhone",
  "nextOfKinRelationship",
  "preferredLanguage",
  "timezone",
  "dateFormat",
  "numberFormat",
  "theme",
] as const;

export async function updateMyProfile(
  changes: Record<string, unknown>
): Promise<ActionResult & { fieldErrors?: Record<string, string[]>; profile?: Profile }> {
  const payload: ProfileUpdate = {};

  for (const key of EDITABLE) {
    if (!(key in changes)) continue;
    const value = changes[key];
    if (value === null || typeof value === "string") {
      // "" from a cleared input means "no value", not an empty string.
      (payload as Record<string, unknown>)[key] = value === "" ? null : value;
    }
  }

  if (changes.notificationPreferences && typeof changes.notificationPreferences === "object") {
    const prefs = changes.notificationPreferences as Record<string, unknown>;
    payload.notificationPreferences = {
      sms: prefs.sms === true,
      email: prefs.email === true,
      inApp: prefs.inApp === true,
    };
  }

  if (Object.keys(payload).length === 0) {
    return { ok: false, message: "Nothing to save." };
  }

  try {
    const profile = await updateProfileRequest(payload);
    revalidatePath("/profile");
    return { ok: true, message: "Profile updated.", profile };
  } catch (error) {
    if (error instanceof ApiError && error.fieldErrors) {
      return { ok: false, message: describeError(error), fieldErrors: error.fieldErrors };
    }
    return { ok: false, message: describeError(error) };
  }
}

/** The portrait. FormData because a File only survives the boundary inside one. */
export async function updateMyPhoto(formData: FormData): Promise<ActionResult> {
  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    return { ok: false, message: "Choose an image to upload." };
  }

  try {
    await updateProfilePhotoRequest(photo);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  /* The avatar shows in the top bar on every screen, so the shell has to
     re-render, not just this page. */
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile picture updated." };
}

/**
 * Change password.
 *
 * The API revokes every other session and hands back a replacement token for
 * this device. That token has to be written into the sealed cookie here —
 * without it the user would be signed out of the browser they just changed
 * their password in, which reads as the change having failed.
 */
export async function changeMyPassword(input: {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}): Promise<ActionResult & { fieldErrors?: Record<string, string[]> }> {
  if (input.password !== input.passwordConfirmation) {
    return {
      ok: false,
      message: "The new password and its confirmation do not match.",
      fieldErrors: { password_confirmation: ["The confirmation does not match."] },
    };
  }

  let result;
  try {
    result = await changePasswordRequest(input);
  } catch (error) {
    if (error instanceof ApiError && error.fieldErrors) {
      return { ok: false, message: describeError(error), fieldErrors: error.fieldErrors };
    }
    return { ok: false, message: describeError(error) };
  }

  const session = await getSession();
  session.token = result.token;
  await session.save();

  return {
    ok: true,
    message: result.message ?? "Password updated. Other sessions have been signed out.",
  };
}

/** Removes the portrait; the avatar falls back to initials everywhere. */
export async function removeMyPhoto(): Promise<ActionResult> {
  try {
    await removeProfilePhotoRequest();
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile picture removed." };
}

/**
 * Signs every other device out, keeping this one.
 *
 * The session cookie here is untouched, which is the point: somebody clicks
 * this because they are worried about a device they are NOT holding.
 */
export async function revokeMyOtherSessions(): Promise<ActionResult & { revoked?: number }> {
  try {
    const result = await revokeOtherSessionsRequest();
    revalidatePath("/profile");
    return { ok: true, message: result.message, revoked: result.revoked };
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }
}

/** Re-reads the profile — used after a photo upload to refresh the preview. */
export async function readMyProfile(): Promise<Profile | null> {
  try {
    return await getProfile();
  } catch {
    return null;
  }
}
