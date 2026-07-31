import { CalendarClock } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepaymentSchedules } from "@/lib/api/loans";
import { SchedulesTable } from "@/features/admin/repayment-schedules/schedules-table";
import { PageHeader } from "@/components/settings";

export default async function RepaymentSchedulesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Open to read for the same reason as the formulas; every write is gated by
  // the API on `admin.org_settings`.
  const schedules = await getRepaymentSchedules();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarClock}
        title="Repayment Schedules"
        description="The repayment cadences a loan product can offer. Frequency drives every instalment date."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Repayment Schedules" }]}
      />
      <SchedulesTable schedules={schedules} />
    </div>
  );
}
