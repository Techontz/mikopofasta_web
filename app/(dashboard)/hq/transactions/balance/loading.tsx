import { PageHeaderSkeleton, SettingsCardsSkeleton, SettingsTableSkeleton } from "@/components/settings";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <SettingsCardsSkeleton cards={4} />
      <SettingsTableSkeleton rows={6} />
    </>
  );
}
