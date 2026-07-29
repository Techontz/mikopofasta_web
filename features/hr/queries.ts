import "server-only";
import { ROLE_LABELS } from "@/config/permissions";
import type { StaffListItem } from "@/lib/api/hr";
import type { StaffRow } from "@/features/hr/staff-table";

/**
 * The staff list row.
 *
 * Name, role and branch all travel with the record — the API resolves them so a
 * table of employees does not cost one request per row. `staffName` is gone for
 * the same reason: every resource that references a staff member now carries
 * `staffName` itself.
 */
export function toStaffRow(staff: StaffListItem): StaffRow {
  return {
    id: staff.id,
    employeeNumber: staff.employeeNumber,
    name: staff.name ?? staff.employeeNumber,
    role: staff.role ? (ROLE_LABELS[staff.role] ?? staff.role) : "—",
    branchName: staff.branchName ?? "—",
    baseSalary: staff.baseSalary,
    commissionEligible: staff.commissionEligible,
    employmentStatus: staff.employmentStatus,
    hiredAt: staff.hiredAt,
  };
}
