import "server-only";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/staff-profiles";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { ROLE_LABELS } from "@/config/permissions";
import type { StaffProfile } from "@/types/staff";
import type { StaffRow } from "@/features/hr/staff-table";

export function toStaffRow(staff: StaffProfile): StaffRow {
  const user = MOCK_USERS.find((u) => u.id === staff.userId);
  const branch = staff.branchId ? MOCK_BRANCHES.find((b) => b.id === staff.branchId) : undefined;
  return {
    id: staff.id,
    employeeNumber: staff.employeeNumber,
    name: user?.name ?? staff.userId,
    role: user ? ROLE_LABELS[user.role] : "—",
    branchName: branch?.name ?? "—",
    baseSalary: staff.baseSalary,
    commissionEligible: staff.commissionEligible,
    employmentStatus: staff.employmentStatus,
    hiredAt: staff.hiredAt,
  };
}

export function staffName(staffProfileId: string): string {
  const staff = MOCK_STAFF_PROFILES.find((s) => s.id === staffProfileId);
  if (!staff) return staffProfileId;
  return MOCK_USERS.find((u) => u.id === staff.userId)?.name ?? staff.employeeNumber;
}
