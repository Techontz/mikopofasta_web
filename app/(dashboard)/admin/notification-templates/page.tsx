import { MOCK_NOTIFICATION_TEMPLATES } from "@/lib/mock-data/notification-templates";
import { TemplatesTable } from "@/features/admin/notification-templates/templates-table";

export default function NotificationTemplatesPage() {
  return <TemplatesTable templates={MOCK_NOTIFICATION_TEMPLATES} />;
}
