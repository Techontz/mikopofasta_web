import { Scale } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getPenaltySettings } from "@/lib/api/loan-charges";
import { PageHeader } from "@/components/settings";
import { PenaltyForm } from "@/features/admin/penalty/penalty-form";
import { PenaltySettingsTable } from "@/features/admin/penalty/penalty-settings-table";

export default async function PenaltyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS)) return <AccessDeniedState />;

  const settings = await getPenaltySettings();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Scale}
        title="Penalty"
        description="The organisation-wide penalty default applied to newly created loan categories."
        breadcrumb={[{ label: "Administration", href: "/admin" }, { label: "Penalty Setting" }]}
      />
      {/* Form above, list below — the legacy screen's arrangement. */}
      <PenaltyForm />
      <PenaltySettingsTable settings={settings} />
    </div>
  );
}
