import "server-only";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { AuthenticatedUser } from "@/types/auth";
import {
  ActivityEntrySchema,
  ProfileSchema,
  SecuritySchema,
  type ActivityEntry,
  type Profile,
  type ProfileUpdate,
  type Security,
} from "@/types/profile";

/**
 * The authentication endpoints — backend §15 / spec §2.
 *
 * Thin by design: each function is one call and one shape. The decisions about
 * what to do with the result (write the session, redirect, surface an error)
 * belong to the Server Actions in lib/auth/actions.ts, not here.
 */

export interface LoginResult {
  token: string;
  tokenType: string;
  user: AuthenticatedUser;
}

/**
 * POST /api/v1/auth/login
 *
 * `deviceName` labels the issued token so a user can tell their sessions
 * apart; the API defaults it when omitted.
 */
export async function login(input: {
  phone: string;
  password: string;
  deviceName?: string;
}): Promise<LoginResult> {
  return apiData<LoginResult>("/api/v1/auth/login", {
    method: "POST",
    body: {
      phone: input.phone,
      password: input.password,
      device_name: input.deviceName ?? "mikopofasta-web",
    },
  });
}

/**
 * POST /api/v1/auth/logout — revokes the caller's token only, leaving that
 * user's other sessions alone.
 */
export async function logout(token: string): Promise<void> {
  await apiData<{ message: string }>("/api/v1/auth/logout", { method: "POST", token });
}

/**
 * GET /api/v1/auth/me
 *
 * Re-resolves the profile and its permissions without a fresh login, which is
 * how permission drift is bounded after an administrator edits the §14 matrix
 * mid-session.
 */
export async function fetchCurrentUser(token: string): Promise<AuthenticatedUser> {
  return apiData<AuthenticatedUser>("/api/v1/auth/me", { token });
}

/* ---------------------------------------------------------------- profile */

/**
 * The signed-in user's own profile.
 *
 * Every call below acts on the token's owner and takes no user id — which is
 * what makes reaching somebody else's record impossible rather than merely
 * forbidden. Managing other people stays in lib/api/users.ts, behind the admin
 * grants, and is untouched.
 */
export async function getProfile(): Promise<Profile> {
  return ProfileSchema.parse(
    await apiData<unknown>("/api/v1/auth/profile", { token: await getApiToken() })
  );
}

/** PATCH /auth/profile — only the self-service keys. */
export async function updateProfileRequest(changes: ProfileUpdate): Promise<Profile> {
  return ProfileSchema.parse(
    await apiData<unknown>("/api/v1/auth/profile", {
      method: "PATCH",
      token: await getApiToken(),
      body: changes,
    })
  );
}

/** POST /auth/profile/photo — multipart, so the File survives. */
export async function updateProfilePhotoRequest(photo: File): Promise<Profile> {
  const form = new FormData();
  form.append("photo", photo);

  return ProfileSchema.parse(
    await apiData<unknown>("/api/v1/auth/profile/photo", {
      method: "POST",
      token: await getApiToken(),
      formData: form,
    })
  );
}

/**
 * POST /auth/change-password.
 *
 * The API revokes every other session and returns a replacement token for this
 * device, so the caller must re-seal the cookie with it — otherwise changing
 * your password would log you out of the browser you did it in.
 */
export async function changePasswordRequest(input: {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}): Promise<{ token: string; message?: string }> {
  return apiData<{ token: string; message?: string }>("/api/v1/auth/change-password", {
    method: "POST",
    token: await getApiToken(),
    body: {
      current_password: input.currentPassword,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    },
  });
}

/** DELETE /auth/profile/photo — removes the portrait and its file. */
export async function removeProfilePhotoRequest(): Promise<Profile> {
  return ProfileSchema.parse(
    await apiData<unknown>("/api/v1/auth/profile/photo", {
      method: "DELETE",
      token: await getApiToken(),
    })
  );
}

/** GET /auth/profile/security — password, sign-in history and live sessions. */
export async function getSecurity(): Promise<Security> {
  return SecuritySchema.parse(
    await apiData<unknown>("/api/v1/auth/profile/security", { token: await getApiToken() })
  );
}

/** GET /auth/profile/activity — this account's own audit entries. */
export async function getActivity(limit = 30): Promise<ActivityEntry[]> {
  const rows = await apiData<unknown[]>("/api/v1/auth/profile/activity", {
    token: await getApiToken(),
    query: { limit },
  });

  return rows.map((row) => ActivityEntrySchema.parse(row));
}

/** POST /auth/sessions/revoke-others — signs every other device out. */
export async function revokeOtherSessionsRequest(): Promise<{ revoked: number; message: string }> {
  return apiData<{ revoked: number; message: string }>("/api/v1/auth/sessions/revoke-others", {
    method: "POST",
    token: await getApiToken(),
  });
}
