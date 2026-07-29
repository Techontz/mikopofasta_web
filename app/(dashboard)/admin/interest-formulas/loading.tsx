import { PageHeaderSkeleton, SettingsCardsSkeleton } from "@/components/settings";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <SettingsCardsSkeleton cards={3} />
    </div>
  );
}
