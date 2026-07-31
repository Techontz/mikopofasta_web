import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PageContainer } from "@/components/settings";

/**
 * The Customer surface. Same design tokens as Bank, Loan and Settings — see the
 * note on the Loan layout for why the wrapper is not optional.
 */
export default async function CustomersLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="st-scope min-h-full" style={{ background: "var(--st-page)" }}>
      <PageContainer>{children}</PageContainer>
    </div>
  );
}
