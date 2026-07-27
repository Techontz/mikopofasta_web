import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminSubNav } from "@/features/admin/admin-sub-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1>Administration</h1>
        <p className="text-sm text-muted-foreground">Organization-wide configuration, access control, and audit visibility.</p>
      </div>
      <AdminSubNav user={user} />
      {children}
    </div>
  );
}
