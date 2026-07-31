import { PageHeaderSkeleton, SettingsFormSkeleton } from "@/components/settings";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <SettingsFormSkeleton />
    </div>
  );
}
