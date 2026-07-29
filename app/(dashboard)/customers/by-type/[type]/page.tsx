import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getAllCustomers } from "@/lib/api/customers";
import { getAllLoans, getRepaymentSchedules } from "@/lib/api/loans";
import { LegacyBreadcrumb } from "@/components/legacy/legacy-primitives";
import {
  LegacyCustomerTable,
  type LegacyCustomerRow,
} from "@/features/legacy/customer-datatable";

/**
 * The old system's "All Customer / Monthly" screen, one route per repayment
 * type. A customer's type is the repayment schedule of the loan they hold —
 * the same derivation the dashboard's rows use.
 */

/** Whole years elapsed, in the operator's timezone. */
function ageFrom(dob: string | null): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
}

function text(value: string | number | boolean | undefined): string | null {
  return value === undefined || value === "" ? null : String(value);
}

export default async function CustomersByTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.CUSTOMERS_VIEW)) return <AccessDeniedState />;

  const [customers, loans, schedules] = await Promise.all([
    getAllCustomers(),
    getAllLoans(),
    getRepaymentSchedules(),
  ]);

  // The slug names a repayment schedule; anything else is not a screen.
  const schedule = schedules.find((s) => s.name.toLowerCase() === type.toLowerCase());
  if (!schedule) notFound();

  /*
   * One loan per customer decides both their membership of this list and the
   * status shown against them. Where a customer holds more than one, the most
   * recently opened wins — the old grid showed the live loan, not the first.
   */
  const latestLoan = new Map<string, (typeof loans)[number]>();
  for (const loan of loans) {
    if (loan.repaymentScheduleId !== schedule.id) continue;
    const held = latestLoan.get(loan.customerId);
    if (!held || (loan.createdAt ?? "") > (held.createdAt ?? "")) latestLoan.set(loan.customerId, loan);
  }

  const rows: LegacyCustomerRow[] = customers
    .filter((customer) => latestLoan.has(customer.id))
    .map((customer) => ({
      id: customer.id,
      photoUrl: customer.photoPath,
      name: customer.fullName,
      customerId: customer.customerNumber,
      checkNumber: text(customer.dynamicFormData?.check_number),
      accountNumber: text(customer.dynamicFormData?.account_number),
      dob: customer.dob,
      age: ageFrom(customer.dob),
      gender: customer.gender,
      phone: customer.phone,
      loanStatus: latestLoan.get(customer.id)?.status ?? null,
      loanStatusLabel: latestLoan.get(customer.id)?.statusLabel ?? null,
    }));

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <LegacyBreadcrumb trail={["All Customer"]} />

      <section className="lg-card p-4 sm:p-5">
        <h1 className="mb-4 text-[19px] font-normal text-[#4a4a4a]">
          All Customer / {schedule.name}
        </h1>
        <LegacyCustomerTable rows={rows} />
      </section>
    </div>
  );
}
