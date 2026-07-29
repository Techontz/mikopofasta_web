import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import type { AuthenticatedUser } from "@/types/auth";

/**
 * The BFF session.
 *
 * Holds the Sanctum bearer token alongside the profile. The token never leaves
 * the server: it is sealed inside this encrypted, httpOnly cookie, read by
 * `lib/api/*` on the server, and attached to outgoing API calls there. Nothing
 * in the browser bundle can reach it, which is the whole reason the API is
 * called through Next rather than directly from the client.
 *
 * The profile is cached here so proxy.ts can gate a route without a round-trip
 * to Laravel on every navigation.
 */
export interface SessionData {
  user?: AuthenticatedUser;
  /** Sanctum bearer token — server-only, never serialised to the client. */
  token?: string;
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error(
    "SESSION_SECRET is missing or too short (needs 32+ chars). See .env.example."
  );
}

export const sessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: "mikopofasta_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

/**
 * Read-only in Server Components (safe: proxy.ts and pages only ever read).
 * Only Server Actions / Route Handlers (mutable cookies()) may call
 * session.save() / session.destroy() — see lib/auth/actions.ts.
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * The signed-in user, or undefined.
 *
 * A session is only signed in when it carries *both* the profile and the token.
 * The profile alone is not enough: every lib/api call authenticates with the
 * token, so a token-less session passes this gate and then fails at the first
 * request with a 401 no Server Component can recover from. Sessions written
 * before the token was added to SessionData are exactly that shape, and they
 * stay valid until iron-session expires them — so they must be rejected here
 * rather than trusted into the dashboard.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | undefined> {
  const session = await getSession();
  return session.token ? session.user : undefined;
}

/**
 * The bearer token for outgoing API calls.
 *
 * Every authenticated request in lib/api/* resolves it through here rather than
 * reading the cookie itself, so one place knows where the token lives and one
 * place changes if that ever moves.
 */
export async function getApiToken(): Promise<string | undefined> {
  const session = await getSession();
  return session.token;
}
