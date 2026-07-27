import { MOCK_REPAYMENT_SCHEDULES } from "@/lib/mock-data/repayment-schedules";
import { SchedulesTable } from "@/features/admin/repayment-schedules/schedules-table";

export default function RepaymentSchedulesPage() {
  return <SchedulesTable schedules={MOCK_REPAYMENT_SCHEDULES} />;
}
