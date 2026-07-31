import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PageContainer } from "@/components/settings";

/**
 * The Group surface. Same design tokens as Bank, Loan and Customer — see the
 * note on the Loan layout for why the wrapper is not optional.
 */
export default async function GroupsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="st-scope min-h-full" style={{ background: "var(--st-page)" }}>
      <PageContainer>{children}</PageContainer>
    </div>
  );
}
