import type {
  DeductedIncome,
  HqTransaction,
  PaidPenalty,
  Penalty,
} from "@/types/operations";
import { LEGACY_BRANCHES } from "@/lib/legacy/source";

/**
 * Placeholder state for the five operational modules.
 *
 * Same rules as the Bank and Salary Advance fixtures: fixed date strings so a
 * server render and its hydration agree, figures that are internally
 * consistent, and names and branches reused from the rest of the app.
 *
 * Values follow the legacy screenshots where they showed real rows — the
 * penalty list — so the new screens can be compared against the old ones
 * directly. (The branch expense requests and their 92,000 total moved to the
 * API's ExpenseSeeder, which reproduces the same figures.)
 */

/**
 * The branch filter on the operational screens.
 *
 * The three legacy branches, plus Head Office because the headquarters expense
 * screens have to be able to name it. "Test" used to be in this list and was
 * pure invention — a value that would have looked like a real branch to anyone
 * reading a filtered report.
 *
 * Sourced from LEGACY_BRANCHES so there is one place a branch name is written
 * down, and it is the one annotated with where each was read from.
 */
export const OPS_BRANCHES = ["Head Office", ...LEGACY_BRANCHES] as const;
export const HQ_STAFF = [
  "Amina Juma",
  "Baraka Mushi",
  "Catherine Massawe",
  "Daniel Kessy",
  "Esther Mollel",
] as const;

// ---------------------------------------------------------------- Penalty
export const MOCK_PENALTIES: Penalty[] = [
  { id: "pen-1", customerName: "FRANK PAUL JUMA", branch: "Kakonko", loanAmount: 272000, penaltyAmount: 30266, date: "2024-10-05" },
  { id: "pen-2", customerName: "CHACHA DISIMAS MCHAINA", branch: "Kakonko", loanAmount: 740000, penaltyAmount: 103000, date: "2024-12-05" },
  { id: "pen-3", customerName: "ALECIA MVUGWA MASELE", branch: "Kakonko", loanAmount: 520000, penaltyAmount: 79500, date: "2024-12-05" },
  { id: "pen-4", customerName: "JOHN JUMA ALLY", branch: "Kakonko", loanAmount: 520000, penaltyAmount: 79500, date: "2024-12-05" },
  { id: "pen-5", customerName: "JUMA PAUL PETER", branch: "Kakonko", loanAmount: 6000000, penaltyAmount: 1103663, date: "2025-08-05" },
  { id: "pen-6", customerName: "JUMA PAUL PETER", branch: "Kakonko", loanAmount: 7200000, penaltyAmount: 212000, date: "2025-01-07" },
  { id: "pen-7", customerName: "JUMA MASWA JUMA", branch: "Missenyi", loanAmount: 650000, penaltyAmount: 43667, date: "2026-02-24" },
];

export const MOCK_PAID_PENALTIES: PaidPenalty[] = [
  { id: "pp-1", customerName: "FRANK PAUL JUMA", branch: "Kakonko", paidAmount: 30266, date: "2025-01-14" },
  { id: "pp-2", customerName: "ALECIA MVUGWA MASELE", branch: "Kakonko", paidAmount: 79500, date: "2025-02-02" },
  { id: "pp-3", customerName: "JOHN JUMA ALLY", branch: "Kakonko", paidAmount: 40000, date: "2025-02-18" },
  { id: "pp-4", customerName: "JUMA PAUL PETER", branch: "Kakonko", paidAmount: 212000, date: "2025-03-09" },
  { id: "pp-5", customerName: "CHACHA DISIMAS MCHAINA", branch: "Kakonko", paidAmount: 103000, date: "2025-04-21" },
];

// -------------------------------------------------------------- Loan Fee
export const MOCK_DEDUCTED_INCOME: DeductedIncome[] = [
  { id: "di-1", customerName: "FRANK PAUL JUMA", branch: "Kakonko", loanApproved: 272000, incomeAmount: 13600, date: "2024-10-05" },
  { id: "di-2", customerName: "CHACHA DISIMAS MCHAINA", branch: "Kakonko", loanApproved: 740000, incomeAmount: 37000, date: "2024-12-05" },
  { id: "di-3", customerName: "ALECIA MVUGWA MASELE", branch: "Kakonko", loanApproved: 520000, incomeAmount: 26000, date: "2024-12-05" },
  { id: "di-4", customerName: "JUMA PAUL PETER", branch: "Kakonko", loanApproved: 6000000, incomeAmount: 300000, date: "2025-08-05" },
  { id: "di-5", customerName: "JUMA MASWA JUMA", branch: "Missenyi", loanApproved: 650000, incomeAmount: 32500, date: "2026-02-24" },
  { id: "di-6", customerName: "EDIGAR JASON PAUL", branch: "NEW KALENGE", loanApproved: 1200000, incomeAmount: 60000, date: "2026-03-11" },
];

/*
 * The expense registers and claim queues used to be fixtures here. Both are
 * served by the API now — lib/api/expenses.ts, backed by `expense_categories`
 * and `expense_requests` — so the fixtures are gone rather than left to drift
 * out of step with the real thing.
 */

// ------------------------------------------------ Headquarters transactions
export const MOCK_HQ_TRANSACTIONS: HqTransaction[] = [
  {
    id: "hq-1", reference: "HQ-2026-0018", branch: "Kakonko", requestedBy: "Amina Juma",
    approvedBy: null, amount: 1500000, reason: "Branch float top-up",
    status: "pending", date: "2026-07-28", direction: "out",
  },
  {
    id: "hq-2", reference: "HQ-2026-0017", branch: "NEW KALENGE", requestedBy: "Frank Urio",
    approvedBy: null, amount: 800000, reason: "Operational expenses",
    status: "pending", date: "2026-07-27", direction: "out",
  },
  {
    id: "hq-3", reference: "HQ-2026-0016", branch: "Head Office", requestedBy: "Catherine Massawe",
    approvedBy: "Daniel Kessy", amount: 12500000, reason: "Capital injection",
    status: "approved", date: "2026-07-25", direction: "in",
  },
  {
    id: "hq-4", reference: "HQ-2026-0015", branch: "Kakonko", requestedBy: "Esther Mollel",
    approvedBy: "Daniel Kessy", amount: 2400000, reason: "Loan disbursement funding",
    status: "approved", date: "2026-07-20", direction: "out",
  },
  {
    id: "hq-5", reference: "HQ-2026-0014", branch: "Head Office", requestedBy: "Baraka Mushi",
    approvedBy: "Daniel Kessy", amount: 4850000, reason: "Collections banked",
    status: "approved", date: "2026-06-28", direction: "in",
  },
  {
    id: "hq-6", reference: "HQ-2026-0013", branch: "Missenyi", requestedBy: "Grace Nyamburi",
    approvedBy: "Daniel Kessy", amount: 900000, reason: "Branch float top-up",
    status: "approved", date: "2026-06-15", direction: "out",
  },
  {
    id: "hq-7", reference: "HQ-2026-0012", branch: "Head Office", requestedBy: "Amina Juma",
    approvedBy: "Daniel Kessy", amount: 3200000, reason: "Collections banked",
    status: "approved", date: "2026-05-30", direction: "in",
  },
  {
    id: "hq-8", reference: "HQ-2026-0011", branch: "Test", requestedBy: "Hamisi Salum",
    approvedBy: "Daniel Kessy", amount: 260000, reason: "Operational expenses",
    status: "rejected", date: "2026-05-21", direction: "out",
  },
  {
    id: "hq-9", reference: "HQ-2026-0010", branch: "NEW KALENGE", requestedBy: "Frank Urio",
    approvedBy: "Daniel Kessy", amount: 1750000, reason: "Loan disbursement funding",
    status: "approved", date: "2026-05-12", direction: "out",
  },
];
