import { round2, formatMoney } from "@/lib/domain/money";
import { PERMISSIONS } from "@/types/auth";
import { customerFullName } from "@/types/customer";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { MOCK_PAYMENTS, MOCK_PAYMENT_ALLOCATIONS, MOCK_SUSPENSE_ITEMS } from "@/lib/mock-data/payments";
import { MOCK_AUDIT_LOGS } from "@/lib/mock-data/audit-logs";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_PAYROLL_RUNS, MOCK_PAYROLL_LINES, MOCK_ZONE_COMMISSION_DISTRIBUTIONS } from "@/lib/mock-data/payroll";
import { MOCK_COMMISSION_POOLS, MOCK_COMMISSION_DISTRIBUTIONS } from "@/lib/mock-data/commission";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/staff-profiles";
import { ZONES } from "@/lib/mock-data/zones";
import { branchName, confirmedPayments, customerOf, liveLoans, withinRange } from "@/lib/domain/reports/sources";
import type { ReportDefinition } from "@/lib/domain/reports/types";

const userName = (id: string | null) => (id ? (MOCK_USERS.find((u) => u.id === id)?.name ?? id) : "System");
const staffDisplayName = (staffProfileId: string) => {
  const staff = MOCK_STAFF_PROFILES.find((s) => s.id === staffProfileId);
  return staff ? userName(staff.userId) : staffProfileId;
};

export const repaymentReport: ReportDefinition = {
  slug: "repayment",
  title: "Repayments",
  description: "Every payment received, with its Penalty/Interest/Principal split.",
  group: "Collections",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["branchId", "from", "to", "period"],
  compute: (filters) => {
    const rows = confirmedPayments(filters).map((payment) => {
      const allocations = MOCK_PAYMENT_ALLOCATIONS.filter((a) => a.paymentId === payment.id);
      const loan = payment.loanId ? MOCK_LOANS.find((l) => l.id === payment.loanId) : undefined;
      const customer = customerOf(payment.customerId);
      return {
        reference: payment.paymentReference,
        receivedAt: payment.receivedAt.slice(0, 10),
        loanNumber: loan?.loanNumber ?? "—",
        customer: customer ? customerFullName(customer) : "—",
        branch: branchName(payment.branchId),
        channel: payment.channel.replace(/_/g, " "),
        penalty: round2(allocations.reduce((s, a) => s + a.penaltyAllocated, 0)),
        interest: round2(allocations.reduce((s, a) => s + a.interestAllocated, 0)),
        principal: round2(allocations.reduce((s, a) => s + a.principalAllocated, 0)),
        amount: payment.amount,
      };
    });

    const penalty = round2(rows.reduce((s, r) => s + r.penalty, 0));
    const interest = round2(rows.reduce((s, r) => s + r.interest, 0));
    const principal = round2(rows.reduce((s, r) => s + r.principal, 0));
    const amount = round2(rows.reduce((s, r) => s + r.amount, 0));

    return {
      columns: [
        { key: "reference", label: "Reference" },
        { key: "receivedAt", label: "Received" },
        { key: "loanNumber", label: "Loan #" },
        { key: "customer", label: "Customer" },
        { key: "branch", label: "Branch" },
        { key: "channel", label: "Channel" },
        { key: "penalty", label: "Penalty", align: "right", money: true },
        { key: "interest", label: "Interest", align: "right", money: true },
        { key: "principal", label: "Principal", align: "right", money: true },
        { key: "amount", label: "Amount", align: "right", money: true },
      ],
      rows,
      totals: { reference: `${rows.length} payments`, penalty, interest, principal, amount },
      summary: [
        { label: "Collected", value: formatMoney(amount) },
        { label: "To Penalty", value: formatMoney(penalty) },
        { label: "To Interest", value: formatMoney(interest) },
        { label: "To Principal", value: formatMoney(principal) },
      ],
      emptyMessage: "No confirmed payments in this window.",
      reconciliation:
        "Splits come from payment_allocations, written by the one allocation core. Allocated total can be less than the amount received when part of a payment went to Suspense as an overpayment.",
    };
  },
};

export const dailyCollectionReport: ReportDefinition = {
  slug: "daily-collection",
  title: "Daily Collection",
  description: "Collections grouped by day.",
  group: "Collections",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["branchId", "from", "to", "period"],
  compute: (filters) => {
    const byDay = new Map<string, { count: number; amount: number }>();
    for (const payment of confirmedPayments(filters)) {
      const day = payment.receivedAt.slice(0, 10);
      const entry = byDay.get(day) ?? { count: 0, amount: 0 };
      entry.count++;
      entry.amount = round2(entry.amount + payment.amount);
      byDay.set(day, entry);
    }

    const rows = Array.from(byDay.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([day, v]) => ({ day, payments: v.count, amount: v.amount }));

    const amount = round2(rows.reduce((s, r) => s + r.amount, 0));

    return {
      columns: [
        { key: "day", label: "Date" },
        { key: "payments", label: "Payments", align: "right" },
        { key: "amount", label: "Collected", align: "right", money: true },
      ],
      rows,
      totals: { day: "Total", payments: rows.reduce((s, r) => s + r.payments, 0), amount },
      summary: [
        { label: "Days with Collections", value: String(rows.length) },
        { label: "Total Collected", value: formatMoney(amount) },
      ],
      emptyMessage: "No collections in this window.",
      reconciliation: "Sums to the same figure as the Repayments report over the same filters.",
    };
  },
};

export const dailyDisbursementReport: ReportDefinition = {
  slug: "daily-disbursement",
  title: "Daily Disbursement",
  description: "Loans disbursed, grouped by day.",
  group: "Portfolio",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["branchId", "from", "to", "period"],
  compute: (filters) => {
    const byDay = new Map<string, { count: number; amount: number }>();
    for (const loan of liveLoans(filters)) {
      if (!loan.disbursementDate) continue;
      if (!withinRange(loan.disbursementDate, filters)) continue;
      const entry = byDay.get(loan.disbursementDate) ?? { count: 0, amount: 0 };
      entry.count++;
      entry.amount = round2(entry.amount + loan.principalAmount);
      byDay.set(loan.disbursementDate, entry);
    }

    const rows = Array.from(byDay.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([day, v]) => ({ day, loans: v.count, amount: v.amount }));

    const amount = round2(rows.reduce((s, r) => s + r.amount, 0));

    return {
      columns: [
        { key: "day", label: "Date" },
        { key: "loans", label: "Loans", align: "right" },
        { key: "amount", label: "Disbursed", align: "right", money: true },
      ],
      rows,
      totals: { day: "Total", loans: rows.reduce((s, r) => s + r.loans, 0), amount },
      summary: [
        { label: "Days with Disbursements", value: String(rows.length) },
        { label: "Total Disbursed", value: formatMoney(amount) },
      ],
      emptyMessage: "No disbursements in this window.",
      reconciliation: "Principal disbursed equals the debits posted to Loan Receivable at disbursement.",
    };
  },
};

export const suspenseReport: ReportDefinition = {
  slug: "suspense",
  title: "Suspense",
  description: "Money received that could not be matched to a loan.",
  group: "Compliance",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: [],
  compute: () => {
    const rows = MOCK_SUSPENSE_ITEMS.map((item) => {
      const payment = MOCK_PAYMENTS.find((p) => p.id === item.paymentId);
      return {
        reference: payment?.paymentReference ?? item.paymentId,
        receivedAt: payment ? payment.receivedAt.slice(0, 10) : "—",
        reason: item.reason,
        amount: item.amount,
        status: item.status,
        resolvedBy: item.resolvedBy ? userName(item.resolvedBy) : "—",
      };
    });

    const open = rows.filter((r) => r.status !== "allocated");

    return {
      columns: [
        { key: "reference", label: "Payment" },
        { key: "receivedAt", label: "Received" },
        { key: "reason", label: "Reason" },
        { key: "status", label: "Status" },
        { key: "resolvedBy", label: "Handled by" },
        { key: "amount", label: "Amount", align: "right", money: true },
      ],
      rows,
      totals: { reference: `${rows.length} items`, amount: round2(rows.reduce((s, r) => s + r.amount, 0)) },
      summary: [
        { label: "Open Items", value: String(open.length) },
        { label: "Open Amount", value: formatMoney(round2(open.reduce((s, r) => s + r.amount, 0))) },
      ],
      emptyMessage: "Suspense is clear.",
      reconciliation:
        "Open items should agree with the Suspense Account balance in the trial balance; resolved items were cleared by a second journal entry, never by editing the original.",
    };
  },
};

export const auditTrailReport: ReportDefinition = {
  slug: "audit-trail",
  title: "Audit Trail",
  description: "Every recorded action, who performed it, and against what.",
  group: "Compliance",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["from", "to", "period"],
  compute: (filters) => {
    const rows = MOCK_AUDIT_LOGS.filter((log) => withinRange(log.createdAt, filters))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((log) => ({
        at: new Date(log.createdAt).toLocaleString(),
        action: log.action.replace(/_/g, " "),
        entity: log.auditableType,
        entityId: log.auditableId,
        user: userName(log.userId),
      }));

    return {
      columns: [
        { key: "at", label: "When" },
        { key: "action", label: "Action" },
        { key: "entity", label: "Entity" },
        { key: "entityId", label: "Reference" },
        { key: "user", label: "User" },
      ],
      rows,
      summary: [{ label: "Events", value: String(rows.length) }],
      emptyMessage: "No audit events in this window.",
      reconciliation: "Read directly from audit_logs — the same rows the per-entity Audit Trail tabs display.",
    };
  },
};

export const payrollReport: ReportDefinition = {
  slug: "payroll",
  title: "Payroll",
  description: "Payroll runs and what each staff member was paid.",
  group: "HR",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["period"],
  compute: (filters) => {
    const runs = MOCK_PAYROLL_RUNS.filter((r) => !filters.period || r.period === filters.period);
    const runIds = new Set(runs.map((r) => r.id));
    const lines = MOCK_PAYROLL_LINES.filter((l) => runIds.has(l.payrollRunId));

    const rows = lines.map((line) => {
      const run = runs.find((r) => r.id === line.payrollRunId);
      const staff = MOCK_STAFF_PROFILES.find((s) => s.id === line.staffProfileId);
      return {
        period: run?.period ?? "—",
        status: run?.status ?? "—",
        staff: staffDisplayName(line.staffProfileId),
        branch: branchName(staff?.branchId ?? null),
        base: line.baseSalary,
        commission: line.commissionAmount,
        allowances: line.allowancesTotal,
        deductions: line.deductionsTotal,
        net: line.netSalary,
      };
    });

    const net = round2(rows.reduce((s, r) => s + r.net, 0));

    return {
      columns: [
        { key: "period", label: "Period" },
        { key: "status", label: "Status" },
        { key: "staff", label: "Staff" },
        { key: "branch", label: "Branch" },
        { key: "base", label: "Base", align: "right", money: true },
        { key: "commission", label: "Commission", align: "right", money: true },
        { key: "allowances", label: "Allowances", align: "right", money: true },
        { key: "deductions", label: "Deductions", align: "right", money: true },
        { key: "net", label: "Net", align: "right", money: true },
      ],
      rows,
      totals: {
        period: `${rows.length} payslips`,
        base: round2(rows.reduce((s, r) => s + r.base, 0)),
        commission: round2(rows.reduce((s, r) => s + r.commission, 0)),
        allowances: round2(rows.reduce((s, r) => s + r.allowances, 0)),
        deductions: round2(rows.reduce((s, r) => s + r.deductions, 0)),
        net,
      },
      summary: [
        { label: "Runs", value: String(runs.length) },
        { label: "Payslips", value: String(rows.length) },
        { label: "Net Payroll", value: formatMoney(net) },
      ],
      emptyMessage: "No payroll runs for this period.",
      reconciliation:
        "Only finalized and paid runs have posted to the ledger; a draft run appears here with no corresponding Salary Expense entry, by design.",
    };
  },
};

export const commissionReport: ReportDefinition = {
  slug: "commission",
  title: "Commission",
  description: "Branch pools and the staff shares drawn from them.",
  group: "HR",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["branchId", "period"],
  compute: (filters) => {
    const pools = MOCK_COMMISSION_POOLS.filter(
      (p) => (!filters.branchId || p.branchId === filters.branchId) && (!filters.period || p.period === filters.period)
    );

    const rows = pools.map((pool) => {
      const distributions = MOCK_COMMISSION_DISTRIBUTIONS.filter((d) => d.commissionPoolId === pool.id);
      return {
        branch: branchName(pool.branchId),
        period: pool.period,
        branchProfit: pool.branchProfit,
        lossCarryForward: pool.lossCarryForward,
        hqHold: pool.hqHoldAmount,
        distributable: pool.distributableProfit,
        pool: pool.poolAmount,
        recipients: distributions.length,
        status: pool.distributableProfit > 0 ? "Distributable" : "Blocked — loss not offset",
      };
    });

    return {
      columns: [
        { key: "branch", label: "Branch" },
        { key: "period", label: "Period" },
        { key: "branchProfit", label: "Branch Profit", align: "right", money: true },
        { key: "lossCarryForward", label: "Loss c/f", align: "right", money: true },
        { key: "hqHold", label: "HQ Hold", align: "right", money: true },
        { key: "distributable", label: "Distributable", align: "right", money: true },
        { key: "pool", label: "Pool", align: "right", money: true },
        { key: "recipients", label: "Recipients", align: "right" },
        { key: "status", label: "Status" },
      ],
      rows,
      totals: {
        branch: "Total",
        branchProfit: round2(rows.reduce((s, r) => s + r.branchProfit, 0)),
        pool: round2(rows.reduce((s, r) => s + r.pool, 0)),
        recipients: rows.reduce((s, r) => s + r.recipients, 0),
      },
      emptyMessage: "No commission pools for these filters.",
      reconciliation:
        "A pool with non-positive distributable profit pays nothing and has no recipients — the §11 rule that a branch loss must be offset first.",
    };
  },
};

export const zoneCommissionReport: ReportDefinition = {
  slug: "zone-commission",
  title: "Zone Commission",
  description: "Zone manager overrides on the pools they oversee.",
  group: "HR",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["period"],
  compute: (filters) => {
    const rows = MOCK_ZONE_COMMISSION_DISTRIBUTIONS.filter((z) => !filters.period || z.period === filters.period).map((z) => ({
      zone: ZONES.find((x) => x.id === z.zoneId)?.name ?? z.zoneId,
      period: z.period,
      poolBase: z.totalPoolBase,
      overridePct: z.overridePercentage,
      override: z.overrideAmount,
    }));

    return {
      columns: [
        { key: "zone", label: "Zone" },
        { key: "period", label: "Period" },
        { key: "poolBase", label: "Pool Base", align: "right", money: true },
        { key: "overridePct", label: "Override", align: "right", percent: true },
        { key: "override", label: "Amount", align: "right", money: true },
      ],
      rows,
      totals: { zone: "Total", override: round2(rows.reduce((s, r) => s + r.override, 0)) },
      emptyMessage: "No zone overrides for this period.",
      reconciliation:
        "The override is folded into the zone manager's payroll line rather than posted as a separate pool-level entry, so it is expensed exactly once.",
    };
  },
};
