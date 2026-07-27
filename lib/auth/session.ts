import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import type { AuthenticatedUser } from "@/types/auth";

export interface SessionData {
  user?: AuthenticatedUser;
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

export async function getCurrentUser(): Promise<AuthenticatedUser | undefined> {
  const session = await getSession();
  return session.user;
}
