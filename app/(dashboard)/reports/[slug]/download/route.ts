import { NextRequest } from "next/server";
import { getCurrentUser, getApiToken } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";

/**
 * `GET /reports/{slug}/download?format=csv|xlsx|pdf`
 *
 * A route handler rather than a link straight at the API, because the API token
 * lives server-side: it is read from the session here and put on the outbound
 * request, so nothing secret ever reaches an href. The browser gets a file with
 * a Content-Disposition and saves it, which it does far better than JavaScript
 * assembling a Blob.
 *
 * The whole query string is forwarded untouched. The API decides what a filter
 * means, which branch a user may actually see (§13) and which format it will
 * produce — re-deciding any of that here could only ever contradict it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!hasPermission(user, PERMISSIONS.REPORTS_VIEW)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { slug } = await params;
  const base = process.env.LARAVEL_API_URL;

  if (!base) {
    return new Response("The API URL is not configured.", { status: 500 });
  }

  const token = await getApiToken();
  const search = request.nextUrl.searchParams.toString();

  const upstream = await fetch(
    `${base.replace(/\/$/, "")}/api/v1/reports/${encodeURIComponent(slug)}/export?${search}`,
    {
      headers: {
        Accept: "*/*",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    }
  );

  if (!upstream.ok) {
    // Passed through rather than dressed up: a 404 for a report that does not
    // exist and a 422 for a format that is not produced are both answers the
    // caller needs, and a generic 500 would hide which one happened.
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition":
        upstream.headers.get("content-disposition") ?? `attachment; filename="${slug}"`,
      // Never cached: a report is recomputed on every call, and a stale file
      // would be a figure nobody can trace to a computation timestamp.
      "Cache-Control": "no-store",
    },
  });
}
