import { NextResponse, type NextRequest } from "next/server";
import { unsealData } from "iron-session";
import {
  SESSION_COOKIE_NAME,
  SessionConfigurationError,
  getSessionOptions,
  type SessionData,
} from "@/lib/auth/session";
import { getRequiredPermission } from "@/config/route-permissions";
import { hasAnyPermission, hasPermission } from "@/config/permissions";

/**
 * Route protection + RBAC enforcement, per
 * docs/frontend-technical-specification.md §2/§4. Named `proxy` (not
 * `middleware`) because that convention is deprecated in Next.js 16 — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
 *
 * Reads the session cookie directly (unsealData) rather than the full
 * getIronSession() helper, since proxy only ever needs to read here, never
 * to write — writing only happens in lib/auth/actions.ts (Server Actions).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * The encryption key is resolved here, per request, rather than at import.
   * See the note in lib/auth/session.ts: reading it at module scope made
   * importing this file throw, and `next build` imports it.
   *
   * A deployment with no usable secret cannot verify a session, so it must not
   * serve one. It answers 500 for every request — including /login, because a
   * login form that cannot seal the cookie it is about to write would take the
   * password and then fail anyway. Fail closed and fail loudly: the alternative
   * is a site that quietly signs everybody out and reads as a session bug.
   */
  let password: string;

  try {
    password = getSessionOptions().password as string;
  } catch (error) {
    if (error instanceof SessionConfigurationError) {
      // Logged in full server-side; the response stays generic because the
      // body is public and the message names an environment variable.
      console.error(`[proxy] ${error.message}`);
      return new NextResponse("Server configuration error.", { status: 500 });
    }
    throw error;
  }

  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let session: SessionData | undefined;

  if (cookieValue) {
    try {
      session = await unsealData<SessionData>(cookieValue, { password });
    } catch {
      session = undefined;
    }
  }

  // Both halves are required — see getCurrentUser in lib/auth/session.ts. A
  // cookie holding a profile but no token would otherwise be waved through
  // here *and* bounced off /login by the redirect below, leaving the user
  // trapped on a dashboard that 401s and with no way back to the login form.
  const user = session?.token ? session.user : undefined;
  const isLoginRoute = pathname === "/login";

  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user) {
    const requiredPermission = getRequiredPermission(pathname);
    const allowed = !requiredPermission
      ? true
      : Array.isArray(requiredPermission)
        ? hasAnyPermission(user, requiredPermission)
        : hasPermission(user, requiredPermission);
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/access-denied";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets, image optimization, and
     * favicon — matches the Next.js docs' recommended negative pattern.
     *
     * `mediapipe` is excluded too: it is the self-hosted WASM runtime and face
     * model the KYC scanner fetches. Sending them through the session check
     * redirected them to /login, so the scanner silently failed to start.
     * They are public static assets — the customer's face never goes near them.
     */
    "/((?!_next/static|_next/image|favicon.ico|mediapipe).*)",
  ],
};
