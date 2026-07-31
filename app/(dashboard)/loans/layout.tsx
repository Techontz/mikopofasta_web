import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PageContainer } from "@/components/settings";

/**
 * The Loan surface.
 *
 * Same design tokens as Bank and Settings (`.st-scope`) — without this wrapper
 * every `--st-*` token underneath resolves to nothing and the cards render
 * unpainted, which is exactly what was happening to these screens. Permissions
 * are unchanged: each page still checks for itself.
 */
export default async function LoansLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="st-scope min-h-full" style={{ background: "var(--st-page)" }}>
      <PageContainer>{children}</PageContainer>
    </div>
  );
}
