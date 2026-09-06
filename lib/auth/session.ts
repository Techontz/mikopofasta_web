import "server-only";
import { cache } from "react";
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

/**
 * The cookie's name — safe at module scope because it is not a secret.
 *
 * Split out from the options below so proxy.ts can look the cookie up without
 * resolving the encryption key: a request that carries no session does not need
 * the key to be told it is not signed in.
 */
export const SESSION_COOKIE_NAME = "mikopofasta_session";

/** Thrown when the deployment has no usable SESSION_SECRET. */
export class SessionConfigurationError extends Error {
  constructor() {
    super("SESSION_SECRET is missing or too short (needs 32+ chars). See .env.example.");
    this.name = "SessionConfigurationError";
  }
}

/**
 * The encryption key, resolved per call.
 *
 * ## Why this is not a module-level check
 *
 * It used to be: a `const` read of `process.env.SESSION_SECRET` and a bare
 * `throw` in the module body. That turns importing this file into a
 * side-effecting operation, and `next build` imports it — the "Collecting page
 * data" pass loads every route module to read its exports, and any route whose
 * import graph reaches this one (proxy.ts does, and so does every page calling
 * `getCurrentUser`) executed the throw. A machine that builds without runtime
 * secrets, which is the normal case on Vercel, therefore could not build at
 * all, and the failure named whichever route happened to be collected first
 * rather than the real cause.
 *
 * Reading it inside a function keeps import free of side effects. The check
 * itself is unchanged — same threshold, same message — it simply now runs when
 * a session is actually opened, which is the only moment the answer matters.
 *
 * It still FAILS CLOSED. A missing secret throws; nothing falls back to an
 * unencrypted cookie, a generated key, or an unauthenticated pass. A
 * deployment without the secret serves errors, never unprotected pages.
 */
function requireSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new SessionConfigurationError();
  }

  return secret;
}

/**
 * iron-session's configuration, built per call.
 *
 * Cheap — an object literal and one env read — and deliberately not memoised:
 * caching it would reintroduce a module-level value whose first construction
 * could land during a build.
 */
export function getSessionOptions(): SessionOptions {
  return {
    password: requireSessionSecret(),
    cookieName: SESSION_COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}

/**
 * Read-only in Server Components (safe: proxy.ts and pages only ever read).
 * Only Server Actions / Route Handlers (mutable cookies()) may call
 * session.save() / session.destroy() — see lib/auth/actions.ts.
 *
 * ## Why this is wrapped in React's `cache()`
 *
 * Opening the session is not free: it decrypts and authenticates a ~3.2 KB
 * sealed cookie, which measures ~0.39 ms on this machine and more on a shared
 * VPS. It was being done once per *caller*, and there are a lot of callers in
 * a single render — the dashboard layout, the module layout and the page each
 * ask for the user, and every `lib/api/*` function asks for the token before
 * its request. A customer profile opened roughly thirteen of them, decrypting
 * the same cookie thirteen times to get the same answer.
 *
 * `cache()` scopes memoisation to one server request, which is exactly the
 * lifetime over which the answer cannot change: the cookie arrives with the
 * request and is not rewritten during a render (writes happen in Server
 * Actions and Route Handlers, which are separate requests with their own
 * cache). So this is a deduplication, not a cache with a staleness window —
 * there is no TTL to get wrong and no leakage between users, because the
 * memo lives and dies with the one request that created it.
 */
export const getSession = cache(async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
});

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
