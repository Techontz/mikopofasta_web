import { BellRing } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getNotificationTemplates } from "@/lib/api/system-configuration";
import { TemplatesTable } from "@/features/admin/notification-templates/templates-table";
import { PageHeader } from "@/components/settings";

export default async function NotificationTemplatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  /*
   * The vocabulary comes down beside the rows: which events exist, which
   * placeholders each can fill, and which channels carry a subject. The editor
   * offers the server's answer rather than a second copy kept here — a copy
   * would drift, and the failure mode is a message that looks valid in the form
   * and is rejected on submit.
   */
  const { templates, vocabulary } = await getNotificationTemplates();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BellRing}
        title="Notification Templates"
        description="SMS and email copy for system-triggered events. Placeholders are filled at send time."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Notification Templates" }]}
      />
      <TemplatesTable templates={templates} vocabulary={vocabulary} />
    </div>
  );
}
