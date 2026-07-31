import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PageContainer } from "@/components/settings";

/**
 * The branch Expenses surface.
 *
 * Shares the configuration design tokens with the rest of the app. Each page
 * checks its own permission; this supplies the scope and the gutter only.
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="st-scope min-h-full" style={{ background: "var(--st-page)" }}>
      <PageContainer>{children}</PageContainer>
    </div>
  );
}
