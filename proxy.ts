import { NextResponse, type NextRequest } from "next/server";
import { unsealData } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth/session";
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

  const cookieValue = request.cookies.get(sessionOptions.cookieName)?.value;
  let session: SessionData | undefined;

  if (cookieValue) {
    try {
      session = await unsealData<SessionData>(cookieValue, {
        password: sessionOptions.password as string,
      });
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
