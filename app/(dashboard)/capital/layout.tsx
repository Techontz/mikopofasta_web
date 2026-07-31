import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PageContainer } from "@/components/settings";

/**
 * The Capital surface.
 *
 * Shares the Settings design tokens (`.st-scope`) because it is the same kind
 * of screen — read carefully, edited deliberately — but sits at its own path
 * because it is gated on treasury.view, not admin.org_settings.
 */
export default async function CapitalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="st-scope min-h-full" style={{ background: "var(--st-page)" }}>
      {/* Gutter and rhythm come from PageContainer so every .st-scope surface
          shares one definition — see the note on that component. */}
      <PageContainer>{children}</PageContainer>
    </div>
  );
}
