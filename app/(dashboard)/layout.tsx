import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getBranches } from "@/lib/api/branches";
import { getNotifications } from "@/lib/api/notifications";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: proxy.ts already guarantees a session exists for this
  // route group, but a Server Component never trusts that alone.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [branches, notifications] = await Promise.all([getBranches(), getNotifications()]);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      {/* min-w-0 lets the inset shrink below its content's intrinsic width —
          without it a wide table forces the whole page past the viewport
          instead of scrolling inside its own container. */}
      <SidebarInset className="min-w-0">
        <AppHeader user={user} branches={branches} notifications={notifications} />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
