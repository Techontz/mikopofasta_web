import { MOCK_REPAYMENT_SCHEDULES } from "@/lib/mock-data/repayment-schedules";
import { SchedulesTable } from "@/features/admin/repayment-schedules/schedules-table";
import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/settings";

export default function RepaymentSchedulesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarClock}
        title="Repayment Schedules"
        description="The repayment cadences a loan product can offer. Frequency drives every instalment date."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Repayment Schedules" }]}
      />
      <SchedulesTable schedules={MOCK_REPAYMENT_SCHEDULES} />
    </div>
  );
}
