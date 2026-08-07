import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { ChangePasswordForm } from "@/features/profile/change-password-form";

/**
 * Change password.
 *
 * Its own page rather than a dialog on the profile: it re-issues the session
 * token and signs every other device out, which is a heavier consequence than
 * a modal implies.
 */
export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-4">
      <BreadcrumbLabel label="Change Password" />
      <ChangePasswordForm />
    </div>
  );
}
