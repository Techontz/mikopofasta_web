import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

/**
 * Clears a session whose API token the server no longer honours.
 *
 * THE PROBLEM THIS SOLVES. Two things have to be true to be signed in: the
 * browser holds a sealed session cookie, and the Sanctum token inside it is
 * still live. `proxy.ts` can only see the first. It reads the cookie, finds a
 * token in it, and lets the request through — it deliberately does not call the
 * API to check, because that would be a round trip on every navigation.
 *
 * So when the token dies on the server side and the cookie does not — the
 * token was revoked, it expired, an administrator disabled the account, or the
 * database was reset — the two disagree, and the disagreement lasts as long as
 * the cookie does. The user is admitted to the dashboard, every request behind
 * it answers 401, and every screen shows "Something went wrong". Logging out
 * and back in fixes it, but nothing on screen suggests that: as far as the
 * application has said, they are logged in. This is what the 401s on Reports,
 * Organization Setup and Float Accounts were.
 *
 * A Server Component cannot fix it, because it cannot write cookies. A Route
 * Handler can. Callers that get a 401 send the user here; this destroys the
 * dead cookie and hands them to the login form, which is the one thing that can
 * actually get them working again.
 *
 * Note this only destroys the local cookie. It does not call the API's logout —
 * the token it would present is the one the API has already rejected.
 */
export async function GET() {
  const session = await getSession();
  session.destroy();
  redirect("/login?expired=1");
}
