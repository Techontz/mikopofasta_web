import { MOCK_NOTIFICATION_TEMPLATES } from "@/lib/mock-data/notification-templates";
import { TemplatesTable } from "@/features/admin/notification-templates/templates-table";
import { BellRing } from "lucide-react";
import { PageHeader } from "@/components/settings";

export default function NotificationTemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={BellRing}
        title="Notification Templates"
        description="SMS and email copy for system-triggered events. Placeholders are filled at send time."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Notification Templates" }]}
      />
      <TemplatesTable templates={MOCK_NOTIFICATION_TEMPLATES} />
    </div>
  );
}
