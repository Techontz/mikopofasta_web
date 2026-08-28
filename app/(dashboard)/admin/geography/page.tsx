import { MapPinned } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getGeographyStatus } from "@/lib/api/geography";
import { GeographyImportPanel } from "@/features/admin/geography/geography-import-panel";
import { PageHeader } from "@/components/settings";

/**
 * Administration → Master Data → Geography.
 *
 * The register behind every customer address. Read is gated by the API on
 * `admin.org_settings`, as is the import — reference data decides what an
 * address may say, and somebody who could add a ward could invent one.
 */
export default async function GeographyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const status = await getGeographyStatus();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MapPinned}
        title="Geography"
        description="Region → District → Ward → Street. Registration can only offer an address these tables contain."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Geography" }]}
      />
      <GeographyImportPanel status={status} />
    </div>
  );
}
