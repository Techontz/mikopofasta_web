import { PageHeaderSkeleton, SettingsFormSkeleton, SettingsTableSkeleton } from "@/components/settings";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <SettingsFormSkeleton />
      <SettingsTableSkeleton rows={6} />
    </>
  );
}
