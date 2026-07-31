import { Vault } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getReserveSetting } from "@/lib/api/loan-charges";
import { PageHeader } from "@/components/settings";
import { ReserveSettingForm } from "@/features/admin/reserve-setting/reserve-setting-form";

export default async function ReserveSettingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS)) return <AccessDeniedState />;

  const setting = await getReserveSetting();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Vault}
        title="Reserve Setting"
        description="The reserve percentage held against the portfolio."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Reserve Setting" }]}
      />
      <ReserveSettingForm setting={setting} />
    </div>
  );
}
