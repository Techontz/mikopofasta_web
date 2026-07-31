import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PageContainer } from "@/components/settings";

/**
 * The Settings surface.
 *
 * `.st-scope` switches the content area onto the configuration design tokens
 * (see globals.css). It stops at this subtree — the legacy shell around it and
 * every other module keep their own styling.
 *
 * Navigation lives in the sidebar accordion, exactly where it always has.
 * The old system puts no section rail on these pages, so neither does this.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="st-scope min-h-full" style={{ background: "var(--st-page)" }}>
      <PageContainer>{children}</PageContainer>
    </div>
  );
}
