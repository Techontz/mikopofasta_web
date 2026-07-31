import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PageContainer } from "@/components/settings";

/**
 * The Salary Advance surface.
 *
 * Shares the configuration design tokens with Settings, Capital and Bank — the
 * same kind of screen, read carefully and edited deliberately. Each page still
 * checks its own permission; this only supplies the scope and the gutter.
 */
export default async function SalaryAdvanceLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="st-scope min-h-full" style={{ background: "var(--st-page)" }}>
      <PageContainer>{children}</PageContainer>
    </div>
  );
}
