import { round2, formatMoney } from "@/lib/domain/money";
import { ACCOUNT_TYPE_LABELS } from "@/lib/domain/trial-balance";
import { PERMISSIONS } from "@/types/auth";
import { CHART_OF_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { MOCK_JOURNAL_ENTRIES } from "@/lib/mock-data/journal-entries";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { balancesByType, branchName, journalLines, trialBalance } from "@/lib/domain/reports/sources";
import type { ReportDefinition } from "@/lib/domain/reports/types";

/**
 * The financial reports are projections of the trial balance. They never sum
 * transactions independently — if a figure here disagreed with the ledger, the
 * ledger would be the one that is right, so these read it directly.
 */

export const financialStatementsReport: ReportDefinition = {
  slug: "financial-statements",
  title: "Financial Statements",
  description: "Trial balance by account, with balance-sheet and P&L subtotals.",
  group: "Financial",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["branchId"],
  compute: (filters) => {
    const trial = trialBalance(filters);
    const rows = trial.rows
      .filter((r) => r.debitTotal > 0 || r.creditTotal > 0)
      .map((r) => ({
        code: r.code,
        account: r.name,
        type: ACCOUNT_TYPE_LABELS[r.type],
        debits: r.debitTotal,
        credits: r.creditTotal,
        balance: r.balance,
      }));

    const assets = balancesByType(filters, "asset");
    const liabilities = balancesByType(filters, "liability");
    const equity = balancesByType(filters, "equity");
    const income = balancesByType(filters, "income");
    const expense = balancesByType(filters, "expense");
    // Profit already swept into the Profit Account by month-end close.
    const retained = trial.rows.find((r) => r.code === "3100")?.balance ?? 0;
    // Income and expense recognised since the last close and not yet swept.
    // These are NOT a loss — they are simply un-closed (see addendum A-3).
    const unswept = round2(income - expense);

    const balanceNote = trial.balanced
      ? `Trial balance is in balance — debits and credits both total ${formatMoney(trial.totalDebits)}.`
      : `OUT OF BALANCE by ${formatMoney(Math.abs(trial.totalDebits - trial.totalCredits))} — investigate before relying on any figure here.`;
    const sweepNote =
      Math.abs(unswept) > 0.01
        ? ` ${formatMoney(Math.abs(unswept))} of ${unswept < 0 ? "expense" : "income"} has been recognised since the last month-end close and is not yet swept into the Profit Account — it is un-closed activity, not a loss.`
        : "";

    return {
      columns: [
        { key: "code", label: "Code" },
        { key: "account", label: "Account" },
        { key: "type", label: "Type" },
        { key: "debits", label: "Debits", align: "right", money: true },
        { key: "credits", label: "Credits", align: "right", money: true },
        { key: "balance", label: "Balance", align: "right", money: true },
      ],
      rows,
      totals: { code: "", account: "Total", debits: trial.totalDebits, credits: trial.totalCredits },
      summary: [
        { label: "Assets", value: formatMoney(assets) },
        { label: "Liabilities", value: formatMoney(liabilities) },
        { label: "Equity", value: formatMoney(equity) },
        { label: "Retained (Profit Account)", value: formatMoney(retained) },
        { label: "Un-closed Income", value: formatMoney(income) },
        { label: "Un-closed Expense", value: formatMoney(expense) },
      ],
      emptyMessage: "No postings for these filters.",
      reconciliation: `${balanceNote}${sweepNote}`,
    };
  },
};

export const cashflowReport: ReportDefinition = {
  slug: "cashflow",
  title: "Cashflow",
  description: "Movement across cash and bank accounts over the selected window.",
  group: "Financial",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["branchId", "from", "to", "period"],
  compute: (filters) => {
    const cashAccounts = CHART_OF_ACCOUNTS.filter((a) => a.type === "asset" && !a.isSystem && a.deletedAt === null);
    const cashIds = new Set(cashAccounts.map((a) => a.id));
    const lines = journalLines(filters).filter((l) => cashIds.has(l.accountId));

    const rows = cashAccounts
      .map((account) => {
        const own = lines.filter((l) => l.accountId === account.id);
        const inflow = round2(own.reduce((s, l) => s + l.debitAmount, 0));
        const outflow = round2(own.reduce((s, l) => s + l.creditAmount, 0));
        return {
          code: account.code,
          account: account.name,
          branch: branchName(account.branchId),
          inflow,
          outflow,
          net: round2(inflow - outflow),
        };
      })
      .filter((r) => r.inflow > 0 || r.outflow > 0);

    const inflow = round2(rows.reduce((s, r) => s + r.inflow, 0));
    const outflow = round2(rows.reduce((s, r) => s + r.outflow, 0));

    return {
      columns: [
        { key: "code", label: "Code" },
        { key: "account", label: "Account" },
        { key: "branch", label: "Branch" },
        { key: "inflow", label: "Inflow", align: "right", money: true },
        { key: "outflow", label: "Outflow", align: "right", money: true },
        { key: "net", label: "Net", align: "right", money: true },
      ],
      rows,
      totals: { code: "", account: "Total", inflow, outflow, net: round2(inflow - outflow) },
      summary: [
        { label: "Cash In", value: formatMoney(inflow) },
        { label: "Cash Out", value: formatMoney(outflow) },
        { label: "Net Movement", value: formatMoney(round2(inflow - outflow)) },
      ],
      emptyMessage: "No cash movement in this window.",
      reconciliation: "Inflow and outflow are the debit and credit totals on bank and teller-cash accounts in the ledger.",
    };
  },
};

export const hqCashflowReport: ReportDefinition = {
  slug: "hq-cashflow",
  title: "HQ Cashflow",
  description: "Cash movement scoped to the Head Office branch.",
  group: "Financial",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["from", "to", "period"],
  compute: (filters) => {
    // HQ is a branch record flagged is_head_office — the same report, scoped (§12).
    const hq = MOCK_BRANCHES.find((b) => b.isHeadOffice);
    if (!hq) {
      return { columns: [], rows: [], emptyMessage: "No Head Office branch is configured." };
    }
    const scoped = cashflowReport.compute({ ...filters, branchId: hq.id });
    return {
      ...scoped,
      reconciliation: `${scoped.reconciliation} Scoped to ${hq.name} via branches.is_head_office — the same report definition as branch cashflow, not a separate engine.`,
    };
  },
};

export const branchPnlReport: ReportDefinition = {
  slug: "branch-pnl",
  title: "Branch P&L",
  description: "Income, expense, and profit per branch, straight from branch-tagged journal lines.",
  group: "Branch",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["branchId"],
  compute: (filters) => {
    const branches = MOCK_BRANCHES.filter((b) => b.deletedAt === null && (!filters.branchId || b.id === filters.branchId));

    const rows = branches.map((branch) => {
      const income = balancesByType({ branchId: branch.id }, "income");
      const expense = balancesByType({ branchId: branch.id }, "expense");
      return {
        branch: branch.name,
        type: branch.isHeadOffice ? "Head Office" : branch.type === "sub" ? "Sub-branch" : "Main",
        income,
        expense,
        profit: round2(income - expense),
      };
    });

    const income = round2(rows.reduce((s, r) => s + r.income, 0));
    const expense = round2(rows.reduce((s, r) => s + r.expense, 0));

    return {
      columns: [
        { key: "branch", label: "Branch" },
        { key: "type", label: "Type" },
        { key: "income", label: "Income", align: "right", money: true },
        { key: "expense", label: "Expense", align: "right", money: true },
        { key: "profit", label: "Profit", align: "right", money: true },
      ],
      rows,
      totals: { branch: "Total", type: "", income, expense, profit: round2(income - expense) },
      summary: [
        { label: "Total Income", value: formatMoney(income) },
        { label: "Total Expense", value: formatMoney(expense) },
        { label: "Profit", value: formatMoney(round2(income - expense)) },
      ],
      emptyMessage: "No branches match these filters.",
      reconciliation:
        "Per-branch figures come from journal_entry_lines.branch_id. Month-end close entries are HQ-level and carry no branch, so this shows each branch's income and expense ACTIVITY for the period — not the post-close position the system-wide trial balance shows. Branch totals therefore will not equal the system-wide net balances after a close has run.",
    };
  },
};

export const branchRankingReport: ReportDefinition = {
  slug: "branch-ranking",
  title: "Branch Ranking",
  description: "Branches ranked by profit, with portfolio and collection context.",
  group: "Branch",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: [],
  compute: () => {
    const rows = MOCK_BRANCHES.filter((b) => b.deletedAt === null)
      .map((branch) => {
        const income = balancesByType({ branchId: branch.id }, "income");
        const expense = balancesByType({ branchId: branch.id }, "expense");
        return { branch: branch.name, income, expense, profit: round2(income - expense) };
      })
      .sort((a, b) => b.profit - a.profit)
      .map((r, i) => ({ rank: i + 1, ...r }));

    return {
      columns: [
        { key: "rank", label: "Rank", align: "right" },
        { key: "branch", label: "Branch" },
        { key: "income", label: "Income", align: "right", money: true },
        { key: "expense", label: "Expense", align: "right", money: true },
        { key: "profit", label: "Profit", align: "right", money: true },
      ],
      rows,
      emptyMessage: "No branches configured.",
      reconciliation: "Ranking uses the same per-branch ledger figures as the Branch P&L report.",
    };
  },
};

export const branchEfficiencyReport: ReportDefinition = {
  slug: "branch-efficiency",
  title: "Branch Efficiency",
  description: "Cost-to-income ratio and profit per staff member, per branch.",
  group: "Branch",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["branchId"],
  compute: (filters) => {
    const rows = MOCK_BRANCHES.filter((b) => b.deletedAt === null && (!filters.branchId || b.id === filters.branchId)).map((branch) => {
      const income = balancesByType({ branchId: branch.id }, "income");
      const expense = balancesByType({ branchId: branch.id }, "expense");
      const profit = round2(income - expense);
      return {
        branch: branch.name,
        income,
        expense,
        profit,
        costToIncome: income > 0 ? round2((expense / income) * 100) : 0,
        margin: income > 0 ? round2((profit / income) * 100) : 0,
      };
    });

    return {
      columns: [
        { key: "branch", label: "Branch" },
        { key: "income", label: "Income", align: "right", money: true },
        { key: "expense", label: "Expense", align: "right", money: true },
        { key: "profit", label: "Profit", align: "right", money: true },
        { key: "costToIncome", label: "Cost/Income", align: "right", percent: true },
        { key: "margin", label: "Margin", align: "right", percent: true },
      ],
      rows,
      emptyMessage: "No branches match these filters.",
      reconciliation: "Ratios are derived from the same branch-tagged ledger figures as Branch P&L.",
    };
  },
};

export const reversalsReport: ReportDefinition = {
  slug: "reversals",
  title: "Reversals",
  description: "Every reversal entry posted, and the original it mirrors.",
  group: "Compliance",
  permission: PERMISSIONS.REPORTS_VIEW,
  filters: ["from", "to", "period"],
  compute: (filters) => {
    const reversals = MOCK_JOURNAL_ENTRIES.filter((e) => e.isReversal);
    const rows = reversals
      .filter((e) => {
        const date = e.entryDate;
        if (filters.from && date < filters.from) return false;
        if (filters.to && date > filters.to) return false;
        if (filters.period && !date.startsWith(filters.period)) return false;
        return true;
      })
      .map((entry) => {
        const original = MOCK_JOURNAL_ENTRIES.find((e) => e.id === entry.reversedEntryId);
        return {
          entryNumber: entry.entryNumber,
          entryDate: entry.entryDate,
          reverses: original?.entryNumber ?? "—",
          originalDate: original?.entryDate ?? "—",
          description: entry.description,
        };
      });

    return {
      columns: [
        { key: "entryNumber", label: "Reversal Entry" },
        { key: "entryDate", label: "Posted" },
        { key: "reverses", label: "Reverses" },
        { key: "originalDate", label: "Original Date" },
        { key: "description", label: "Reason" },
      ],
      rows,
      summary: [{ label: "Reversals", value: String(rows.length) }],
      emptyMessage: "No reversals have been posted.",
      reconciliation:
        "Each row is a real journal entry with is_reversal = true; the original entry is left untouched, which is why both appear in the trial balance and net to zero.",
    };
  },
};
