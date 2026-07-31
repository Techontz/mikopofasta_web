import { PageHeaderSkeleton, SettingsTableSkeleton } from "@/components/settings";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <SettingsTableSkeleton rows={8} />
    </>
  );
}
