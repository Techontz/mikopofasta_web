import { PageHeaderSkeleton, SettingsFormSkeleton, SettingsTableSkeleton } from "@/components/settings";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <SettingsFormSkeleton />
      <SettingsTableSkeleton rows={3} />
    </div>
  );
}
