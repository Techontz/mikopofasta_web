import { round2 } from "@/lib/domain/money";
import { formatMoney } from "@/lib/domain/money";
import { LOAN_STATUS_LABELS } from "@/lib/domain/loan-status-machine";
import { scheduleOutstanding } from "@/types/loan";
import { PERMISSIONS } from "@/types/auth";
import { MOCK_CUSTOMER_CATEGORIES } from "@/lib/mock-data/customer-categories";
import { MOCK_LOAN_PRODUCTS } from "@/lib/mock-data/loan-products";
import {
  DPD_BUCKET_LABELS,
  behaviourRating,
  bucketFor,
  branchName,
  customerOf,
  daysPastDue,
  liveLoans,
  loanDue,
  loanOutstanding,
  loanPaid,
  openBookLoans,
  schedulesFor,
} from "@/lib/domain/reports/sources";
import { customerFullName } from "@/types/customer";
import type { ReportDefinition } from "@/lib/domain/reports/types";

const LOAN_RECEIVABLE_NOTE =
  "Outstanding is summed from loan_schedules for disbursed loans only — the same rule the Loans module applies, so this ties to the Loan Receivable account net of repayments.";

export const portfolioReport: ReportDefinition = {
  slug: "portfolio",
  title: "Loan Portfolio",
  description: "Every loan with money out, its balance, and how much has been repaid.",
  group: "Portfolio",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["branchId"],
  compute: (filters) => {
    const loans = openBookLoans(filters);
    const rows = loans.map((loan) => {
      const customer = customerOf(loan.customerId);
      const due = loanDue(loan);
      const paid = loanPaid(loan);
      return {
        loanNumber: loan.loanNumber,
        customer: customer ? customerFullName(customer) : "—",
        branch: branchName(loan.branchId),
        product: MOCK_LOAN_PRODUCTS.find((p) => p.id === loan.loanProductId)?.name ?? "—",
        status: LOAN_STATUS_LABELS[loan.status],
        principal: loan.principalAmount,
        totalDue: due,
        paid,
        outstanding: loanOutstanding(loan),
      };
    });

    const principal = round2(rows.reduce((s, r) => s + r.principal, 0));
    const outstanding = round2(rows.reduce((s, r) => s + r.outstanding, 0));
    const paid = round2(rows.reduce((s, r) => s + r.paid, 0));

    return {
      columns: [
        { key: "loanNumber", label: "Loan #" },
        { key: "customer", label: "Customer" },
        { key: "branch", label: "Branch" },
        { key: "product", label: "Product" },
        { key: "status", label: "Status" },
        { key: "principal", label: "Principal", align: "right", money: true },
        { key: "totalDue", label: "Total Due", align: "right", money: true },
        { key: "paid", label: "Paid", align: "right", money: true },
        { key: "outstanding", label: "Outstanding", align: "right", money: true },
      ],
      rows,
      totals: { loanNumber: `${rows.length} loans`, principal, paid, outstanding },
      summary: [
        { label: "Active Loans", value: String(rows.length) },
        { label: "Principal Disbursed", value: formatMoney(principal) },
        { label: "Collected", value: formatMoney(paid) },
        { label: "Outstanding", value: formatMoney(outstanding) },
      ],
      emptyMessage: "No disbursed loans match these filters.",
      reconciliation: LOAN_RECEIVABLE_NOTE,
    };
  },
};

export const arrearsReport: ReportDefinition = {
  slug: "arrears",
  title: "Arrears",
  description: "Loans with at least one overdue installment, aged by days past due.",
  group: "Collections",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["branchId"],
  compute: (filters) => {
    const rows = openBookLoans(filters)
      .map((loan) => {
        const dpd = daysPastDue(loan);
        const overdueAmount = round2(
          schedulesFor(loan.id)
            .filter((s) => scheduleOutstanding(s).total > 0 && new Date(s.dueDate) < new Date())
            .reduce((sum, s) => sum + scheduleOutstanding(s).total, 0)
        );
        return { loan, dpd, overdueAmount };
      })
      .filter((x) => x.overdueAmount > 0)
      .sort((a, b) => b.dpd - a.dpd)
      .map(({ loan, dpd, overdueAmount }) => {
        const customer = customerOf(loan.customerId);
        return {
          loanNumber: loan.loanNumber,
          customer: customer ? customerFullName(customer) : "—",
          branch: branchName(loan.branchId),
          status: LOAN_STATUS_LABELS[loan.status],
          daysPastDue: dpd,
          bucket: DPD_BUCKET_LABELS[bucketFor(dpd)],
          overdue: overdueAmount,
          outstanding: loanOutstanding(loan),
        };
      });

    const overdue = round2(rows.reduce((s, r) => s + r.overdue, 0));

    return {
      columns: [
        { key: "loanNumber", label: "Loan #" },
        { key: "customer", label: "Customer" },
        { key: "branch", label: "Branch" },
        { key: "status", label: "Status" },
        { key: "daysPastDue", label: "DPD", align: "right" },
        { key: "bucket", label: "Bucket" },
        { key: "overdue", label: "Overdue", align: "right", money: true },
        { key: "outstanding", label: "Outstanding", align: "right", money: true },
      ],
      rows,
      totals: { loanNumber: `${rows.length} loans`, overdue, outstanding: round2(rows.reduce((s, r) => s + r.outstanding, 0)) },
      summary: [
        { label: "Loans in Arrears", value: String(rows.length) },
        { label: "Overdue Amount", value: formatMoney(overdue) },
      ],
      emptyMessage: "No loans are in arrears for these filters.",
      reconciliation:
        "Overdue is the unpaid portion of installments past their due date, read from loan_schedules — including penalties accrued by the overdue run (see OSC-1: accrued penalties are not a ledger balance).",
    };
  },
};

export const ageAnalysisReport: ReportDefinition = {
  slug: "age-analysis",
  title: "Age Analysis",
  description: "Portfolio split across days-past-due buckets.",
  group: "Collections",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["branchId"],
  compute: (filters) => {
    const loans = openBookLoans(filters);
    const totalOutstanding = round2(loans.reduce((s, l) => s + loanOutstanding(l), 0));

    const rows = (Object.keys(DPD_BUCKET_LABELS) as (keyof typeof DPD_BUCKET_LABELS)[]).map((bucket) => {
      const inBucket = loans.filter((l) => bucketFor(daysPastDue(l)) === bucket);
      const amount = round2(inBucket.reduce((s, l) => s + loanOutstanding(l), 0));
      return {
        bucket: DPD_BUCKET_LABELS[bucket],
        loans: inBucket.length,
        outstanding: amount,
        share: totalOutstanding > 0 ? round2((amount / totalOutstanding) * 100) : 0,
      };
    });

    return {
      columns: [
        { key: "bucket", label: "Bucket" },
        { key: "loans", label: "Loans", align: "right" },
        { key: "outstanding", label: "Outstanding", align: "right", money: true },
        { key: "share", label: "Share", align: "right", percent: true },
      ],
      rows,
      totals: { bucket: "Total", loans: loans.length, outstanding: totalOutstanding, share: totalOutstanding > 0 ? 100 : 0 },
      summary: [
        {
          label: "Portfolio at Risk (8+ days)",
          value: formatMoney(
            round2(
              rows
                .filter((r) => r.bucket === DPD_BUCKET_LABELS.risk || r.bucket === DPD_BUCKET_LABELS.default)
                .reduce((s, r) => s + r.outstanding, 0)
            )
          ),
        },
        { label: "Total Outstanding", value: formatMoney(totalOutstanding) },
      ],
      emptyMessage: "No disbursed loans to age.",
      reconciliation: "Bucket outstanding sums to the same portfolio total as the Loan Portfolio report.",
    };
  },
};

export const repaymentBehaviorReport: ReportDefinition = {
  slug: "repayment-behavior",
  title: "Repayment Behaviour",
  description: "Per-customer A/B/C/D scoring derived from days past due and repayment rate.",
  group: "Collections",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["branchId"],
  compute: (filters) => {
    const loans = openBookLoans(filters);
    const byCustomer = new Map<string, typeof loans>();
    for (const loan of loans) {
      const list = byCustomer.get(loan.customerId) ?? [];
      list.push(loan);
      byCustomer.set(loan.customerId, list);
    }

    const rows = Array.from(byCustomer.entries()).map(([customerId, customerLoans]) => {
      const customer = customerOf(customerId);
      const worstDpd = Math.max(...customerLoans.map((l) => daysPastDue(l)));
      const due = round2(customerLoans.reduce((s, l) => s + loanDue(l), 0));
      const paid = round2(customerLoans.reduce((s, l) => s + loanPaid(l), 0));
      return {
        customer: customer ? customerFullName(customer) : customerId,
        branch: branchName(customer?.branchId ?? null),
        loans: customerLoans.length,
        totalDue: due,
        paid,
        repaidPct: due > 0 ? round2((paid / due) * 100) : 0,
        worstDpd,
        rating: behaviourRating(worstDpd),
      };
    });

    rows.sort((a, b) => a.rating.localeCompare(b.rating) || b.worstDpd - a.worstDpd);

    const counts = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
    for (const r of rows) counts[r.rating]++;

    return {
      columns: [
        { key: "customer", label: "Customer" },
        { key: "branch", label: "Branch" },
        { key: "loans", label: "Loans", align: "right" },
        { key: "totalDue", label: "Total Due", align: "right", money: true },
        { key: "paid", label: "Paid", align: "right", money: true },
        { key: "repaidPct", label: "Repaid", align: "right", percent: true },
        { key: "worstDpd", label: "Worst DPD", align: "right" },
        { key: "rating", label: "Rating" },
      ],
      rows,
      summary: (["A", "B", "C", "D"] as const).map((r) => ({ label: `Rating ${r}`, value: String(counts[r]) })),
      emptyMessage: "No customers with a disbursed loan.",
      reconciliation:
        "Ratings are computed on read from loan_schedules; customer_risk_scores is a cached projection of the same inputs, never an independent source.",
    };
  },
};

export const segmentationReport: ReportDefinition = {
  slug: "segmentation",
  title: "Customer Segmentation",
  description: "Portfolio and customer counts by customer category.",
  group: "Portfolio",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["branchId"],
  compute: (filters) => {
    const loans = openBookLoans(filters);

    const rows = MOCK_CUSTOMER_CATEGORIES.filter((c) => c.deletedAt === null).map((category) => {
      const categoryLoans = loans.filter((l) => customerOf(l.customerId)?.customerCategoryId === category.id);
      const outstanding = round2(categoryLoans.reduce((s, l) => s + loanOutstanding(l), 0));
      const customers = new Set(categoryLoans.map((l) => l.customerId)).size;
      return {
        category: category.name,
        riskTier: category.riskTier,
        sector: category.sector,
        customers,
        loans: categoryLoans.length,
        outstanding,
        avgLoan: categoryLoans.length > 0 ? round2(outstanding / categoryLoans.length) : 0,
      };
    });

    return {
      columns: [
        { key: "category", label: "Category" },
        { key: "riskTier", label: "Risk Tier" },
        { key: "sector", label: "Sector" },
        { key: "customers", label: "Customers", align: "right" },
        { key: "loans", label: "Loans", align: "right" },
        { key: "outstanding", label: "Outstanding", align: "right", money: true },
        { key: "avgLoan", label: "Avg Loan", align: "right", money: true },
      ],
      rows,
      totals: {
        category: "Total",
        customers: rows.reduce((s, r) => s + r.customers, 0),
        loans: rows.reduce((s, r) => s + r.loans, 0),
        outstanding: round2(rows.reduce((s, r) => s + r.outstanding, 0)),
      },
      emptyMessage: "No categories configured.",
      reconciliation: "Outstanding sums to the same portfolio total as the Loan Portfolio report.",
    };
  },
};

export const recoveryReport: ReportDefinition = {
  slug: "recovery",
  title: "Recovery",
  description: "Defaulted, written-off, and recovered loans.",
  group: "Collections",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["branchId"],
  compute: (filters) => {
    const rows = liveLoans(filters)
      .filter((l) => ["defaulted", "written_off", "recovered"].includes(l.status))
      .map((loan) => {
        const customer = customerOf(loan.customerId);
        return {
          loanNumber: loan.loanNumber,
          customer: customer ? customerFullName(customer) : "—",
          branch: branchName(loan.branchId),
          status: LOAN_STATUS_LABELS[loan.status],
          principal: loan.principalAmount,
          paid: loanPaid(loan),
          outstanding: loanOutstanding(loan),
          disbursedOn: loan.disbursementDate ?? "—",
        };
      });

    return {
      columns: [
        { key: "loanNumber", label: "Loan #" },
        { key: "customer", label: "Customer" },
        { key: "branch", label: "Branch" },
        { key: "status", label: "Status" },
        { key: "disbursedOn", label: "Disbursed" },
        { key: "principal", label: "Principal", align: "right", money: true },
        { key: "paid", label: "Recovered", align: "right", money: true },
        { key: "outstanding", label: "Outstanding", align: "right", money: true },
      ],
      rows,
      totals: {
        loanNumber: `${rows.length} loans`,
        principal: round2(rows.reduce((s, r) => s + r.principal, 0)),
        paid: round2(rows.reduce((s, r) => s + r.paid, 0)),
        outstanding: round2(rows.reduce((s, r) => s + r.outstanding, 0)),
      },
      emptyMessage: "No defaulted, written-off, or recovered loans.",
      reconciliation:
        "Write-offs and recoveries post to the Write-Off Expense and Recovered Loans accounts; this report lists the loans behind those balances.",
    };
  },
};
