import type { StaffPerformanceRecord } from "@/types/staff";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/staff-profiles";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { COMMISSION_PERIOD } from "@/lib/mock-data/commission";

/**
 * Targets/achieved are free-form JSON in the schema (§2.9); these are the
 * metrics a Branch Manager actually reviews for field staff.
 */
const FIELD_ROLES = ["loan_officer", "credit_officer", "branch_manager", "teller"];

export const MOCK_STAFF_PERFORMANCE_RECORDS: StaffPerformanceRecord[] = MOCK_STAFF_PROFILES.filter((staff) => {
  const user = MOCK_USERS.find((u) => u.id === staff.userId);
  return user ? FIELD_ROLES.includes(user.role) : false;
}).map((staff, i) => {
  const targets = { loans_disbursed: 12, collection_rate_pct: 95, new_customers: 8 };
  const achieved = {
    loans_disbursed: 8 + ((i * 3) % 7),
    collection_rate_pct: 82 + ((i * 5) % 16),
    new_customers: 5 + ((i * 2) % 6),
  };
  const hitRate =
    (achieved.loans_disbursed / targets.loans_disbursed +
      achieved.collection_rate_pct / targets.collection_rate_pct +
      achieved.new_customers / targets.new_customers) /
    3;
  const rating = hitRate >= 0.95 ? "A" : hitRate >= 0.85 ? "B" : hitRate >= 0.7 ? "C" : "D";

  return {
    id: `perf-${i + 1}`,
    staffProfileId: staff.id,
    period: COMMISSION_PERIOD,
    targets,
    achieved,
    rating: rating as StaffPerformanceRecord["rating"],
    recordedBy: "u-branch-manager",
  };
});
