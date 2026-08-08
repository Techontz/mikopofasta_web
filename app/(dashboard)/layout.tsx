import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/session";
import { getCompanyProfile } from "@/lib/api/organization";
import { getNotifications } from "@/lib/api/notifications";
import { LegacySidebar } from "@/components/legacy/legacy-sidebar";
import { LegacyTopbar } from "@/components/legacy/legacy-topbar";
import { MobileNavBackdrop, MobileNavProvider } from "@/components/legacy/mobile-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: proxy.ts already guarantees a session exists for this
  // route group, but a Server Component never trusts that alone.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  /*
   * The shell must render even when a role cannot read one of these, so both
   * fail soft — a user without the permission gets the bar rather than an
   * error page.
   *
   * `getAllCustomers()` used to be a third entry here, feeding the top bar's
   * selector. It walks the customer paginator a hundred rows at a time, so it
   * put up to fifty sequential API calls in front of every single navigation in
   * the application, and pushed the whole customer book into the DOM of every
   * page. The bar now searches on demand instead — see `CustomerJump` — and
   * this layout no longer reads customers at all.
   */
  const [profile, notifications] = await Promise.all([
    getCompanyProfile().catch(deadSessionOrNull),
    getNotifications().catch(() => []),
  ]);

  return (
    <MobileNavProvider>
      <div className="lg-shell flex h-svh flex-col" style={{ background: "var(--lg-body)" }}>
        <LegacyTopbar notifications={notifications} />
        <MobileNavBackdrop />
        <div className="flex min-h-0 flex-1">
          <LegacySidebar user={user} tenantName={profile?.tradingName ?? "M-Kopa"} />
          {/* min-w-0 lets the pane shrink below its content's intrinsic width —
              without it a wide table forces the whole page past the viewport
              instead of scrolling inside its own container. */}
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </MobileNavProvider>
  );
}

/**
 * Tells a permission failure apart from a dead session, and acts on the second.
 *
 * These layout reads are deliberately forgiving — a role that cannot see the
 * company profile should still get a working shell, not an error page. But
 * "forgiving" was swallowing two different failures as if they were one.
 *
 * A 403 means this user may not read this thing: correct to ignore, the shell
 * carries on without it. A 401 means the API does not accept the session's
 * token at all — it was revoked, it expired, the account was disabled — and
 * that is not survivable. `proxy.ts` cannot catch it, because the sealed cookie
 * is still perfectly valid and it does not ask the API; so the user is let into
 * a dashboard where every screen fails and nothing tells them to log in again.
 *
 * The layout runs on every dashboard navigation, which makes it the one place
 * that reliably notices. Sending them to /session-expired clears the dead
 * cookie and puts them in front of the login form.
 */
function deadSessionOrNull(error: unknown): null {
  if (error instanceof ApiError && error.isUnauthenticated) redirect("/session-expired");
  return null;
}
