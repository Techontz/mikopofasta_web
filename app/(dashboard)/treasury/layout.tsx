import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PageContainer } from "@/components/settings";

/**
 * The Bank surface.
 *
 * Shares the configuration design tokens (`.st-scope`) with Settings and
 * Capital — it is the same kind of screen, read carefully and edited
 * deliberately — while keeping its own path and its own `treasury.view` gate.
 * Permissions are unchanged: each page still checks for itself.
 */
export default async function TreasuryLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="st-scope min-h-full" style={{ background: "var(--st-page)" }}>
      <PageContainer>{children}</PageContainer>
    </div>
  );
}
