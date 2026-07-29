import "server-only";
import { apiData } from "@/lib/api/client";
import type { AuthenticatedUser } from "@/types/auth";

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
