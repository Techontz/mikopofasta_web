import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCompanyProfile } from "@/lib/api/organization";
import { getAllCustomers } from "@/lib/api/customers";
import { getNotifications } from "@/lib/api/notifications";
import { LegacySidebar } from "@/components/legacy/legacy-sidebar";
import { LegacyTopbar } from "@/components/legacy/legacy-topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: proxy.ts already guarantees a session exists for this
  // route group, but a Server Component never trusts that alone.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  /*
   * The shell must render even when a role cannot read one of these. A user
   * without customers.view still gets the bar — with an empty selector —
   * rather than an error page.
   */
  const [profile, customers, notifications] = await Promise.all([
    getCompanyProfile().catch(() => null),
    getAllCustomers().catch(() => []),
    getNotifications().catch(() => []),
  ]);

  return (
    <div className="lg-shell flex h-svh flex-col" style={{ background: "var(--lg-body)" }}>
      <LegacyTopbar
        customers={customers.map((c) => ({ id: c.id, label: c.fullName }))}
        notifications={notifications}
      />
      <div className="flex min-h-0 flex-1">
        <LegacySidebar user={user} tenantName={profile?.tradingName ?? "Mikopofasta"} />
        {/* min-w-0 lets the pane shrink below its content's intrinsic width —
            without it a wide table forces the whole page past the viewport
            instead of scrolling inside its own container. */}
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
