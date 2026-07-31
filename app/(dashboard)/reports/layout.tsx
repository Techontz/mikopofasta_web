import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PageContainer } from "@/components/settings";

/**
 * The Report surface.
 *
 * The same wrapper every Menu-tab module has — `.st-scope` supplies the design
 * tokens and PageContainer the gutter and rhythm. Without it every `--st-*`
 * underneath resolves to nothing and the cards render unpainted, which is why
 * these pages could not match the rest of the app.
 *
 * Permissions are unchanged: each page still checks for itself.
 */
export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="st-scope min-h-full" style={{ background: "var(--st-page)" }}>
      <PageContainer>{children}</PageContainer>
    </div>
  );
}
