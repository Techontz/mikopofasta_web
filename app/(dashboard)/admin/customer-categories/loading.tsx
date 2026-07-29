import { PageHeaderSkeleton, SettingsTableSkeleton } from "@/components/settings";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <SettingsTableSkeleton />
    </div>
  );
}
