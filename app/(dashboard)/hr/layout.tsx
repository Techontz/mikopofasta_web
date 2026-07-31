import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PageContainer } from "@/components/settings";

/**
 * The HRM surface.
 *
 * Was scoped to /hr/payroll alone, because that was the only HR screen on the
 * configuration design system; the rest of the module still used the older card
 * kit. Now that every HR page has been moved onto the same components as the
 * Menu modules, the wrapper belongs at the module root — one `.st-scope`, one
 * gutter, rather than a nested pair that would double the page padding.
 *
 * Permissions and routes are untouched: each page still checks for itself.
 */
export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="st-scope min-h-full" style={{ background: "var(--st-page)" }}>
      <PageContainer>{children}</PageContainer>
    </div>
  );
}
