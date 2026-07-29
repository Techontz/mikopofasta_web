"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { login as apiLogin, logout as apiLogout } from "@/lib/api/auth";
import { ApiError, describeError } from "@/lib/api/errors";

const loginSchema = z.object({
  phone: z.string().min(9, "Enter a valid phone number"),
  password: z.string().min(1, "Password is required"),
});

export interface LoginState {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

/**
 * `POST /api/v1/auth/login`, via Sanctum.
 *
 * This Server Action is the only place the session cookie is written. The
 * bearer token goes into that encrypted cookie and no further — it never
 * reaches client-side JavaScript, which is the point of routing the API
 * through Next at all.
 *
 * The shape here is unchanged from the mock: the same `LoginState`, the same
 * field errors, the same redirect. Only the credential check moved from a seed
 * array to the API.
 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the form.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  let result;

  try {
    result = await apiLogin(parsed.data);
  } catch (error) {
    /*
     * The API distinguishes a rejected password (401 INVALID_CREDENTIALS), a
     * suspended account (403 ACCOUNT_SUSPENDED) and too many attempts (429),
     * and each deserves its own wording — a single "login failed" would leave a
     * suspended user retrying a password that was never the problem.
     */
    if (error instanceof ApiError && error.isValidation) {
      return { ok: false, message: "Please check the form.", fieldErrors: error.fieldErrors };
    }

    return { ok: false, message: describeError(error) };
  }

  const session = await getSession();
  session.user = result.user;
  session.token = result.token;
  await session.save();

  redirect("/dashboard");
}

/**
 * Signs out both ends.
 *
 * The API call revokes the token server-side so a leaked cookie cannot outlive
 * the session; the local destroy clears the cookie. If the API call fails — the
 * token was already revoked, the server is unreachable — the local session is
 * destroyed anyway, because a user who clicked "log out" must end up logged out
 * of this browser regardless of what the network did.
 */
export async function logoutAction(): Promise<void> {
  const session = await getSession();
  const token = session.token;

  if (token) {
    try {
      await apiLogout(token);
    } catch {
      // Deliberately swallowed — see above.
    }
  }

  session.destroy();
  redirect("/login");
}
