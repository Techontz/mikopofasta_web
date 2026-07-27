import type { StaffProfile, StaffBankDetails } from "@/types/staff";
import { employeeNumber } from "@/lib/domain/id-generators";
import { dateOnlyDaysAgo } from "@/lib/domain/rng";
import { MOCK_USERS } from "@/lib/mock-data/users";

/** One StaffProfile per demo user — every system user is company staff. */
export const MOCK_STAFF_PROFILES: StaffProfile[] = MOCK_USERS.map((user, i) => {
  const isHq = ["super_admin", "admin", "finance", "hr", "auditor"].includes(user.role);
  const baseSalary = isHq ? 1_800_000 : user.role === "branch_manager" ? 1_400_000 : user.role === "credit_officer" ? 1_000_000 : user.role === "zone_manager" || user.role === "regional_manager" ? 1_600_000 : 800_000;
  return {
    id: `staff-${user.id}`,
    userId: user.id,
    employeeNumber: employeeNumber(i + 1),
    branchId: user.branchId,
    zoneId: user.zoneId,
    baseSalary,
    commissionEligible: ["branch_manager", "loan_officer", "credit_officer", "teller", "zone_manager", "regional_manager"].includes(user.role),
    paymentMethod: "bank",
    employmentStatus: "active",
    hiredAt: dateOnlyDaysAgo(400 + i * 30),
    deletedAt: null,
  };
});

export function staffProfileIdForUser(userId: string): string {
  const profile = MOCK_STAFF_PROFILES.find((p) => p.userId === userId);
  if (!profile) throw new Error(`No staff profile for user ${userId}`);
  return profile.id;
}

export const MOCK_STAFF_BANK_DETAILS: StaffBankDetails[] = MOCK_STAFF_PROFILES.map((profile, i) => ({
  id: `sbd-${i + 1}`,
  staffProfileId: profile.id,
  bankName: i % 2 === 0 ? "NMB" : "CRDB",
  accountNumber: String(30_000_000 + i * 111),
}));
