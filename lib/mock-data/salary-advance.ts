import type {
  SalaryAdvance,
  SalaryAdvanceCategory,
  SalaryAdvancePayment,
} from "@/types/salary-advance";

/**
 * Placeholder state for the Salary Advance module.
 *
 * Same rules as the Bank fixture: fixed date strings so a server render and its
 * hydration agree, and figures that are internally consistent — every advance's
 * interest is its category's rate applied to its principal, and paid amounts
 * never exceed principal + interest. A screen that adds up is the only way to
 * tell a layout bug from an arithmetic one.
 *
 * Staff names and branches reuse the ones already seeded across the app so the
 * module reads as part of the same system.
 */

export const ADVANCE_BRANCHES = ["Headquarters", "Kakonko", "Missenyi", "NEW KALENGE", "Test"] as const;

export const MOCK_ADVANCE_CATEGORIES: SalaryAdvanceCategory[] = [
  { id: "cat-1", name: "Mini Advance", interestRate: 5, fromAmount: 50000, toAmount: 300000, chargeFee: 2000 },
  { id: "cat-2", name: "Standard Advance", interestRate: 10, fromAmount: 300001, toAmount: 1000000, chargeFee: 5000 },
  { id: "cat-3", name: "Senior Advance", interestRate: 12, fromAmount: 1000001, toAmount: 3000000, chargeFee: 10000 },
  { id: "cat-4", name: "Emergency Advance", interestRate: 15, fromAmount: 50000, toAmount: 500000, chargeFee: 3000 },
  { id: "cat-5", name: "Management Advance", interestRate: 8, fromAmount: 3000001, toAmount: 10000000, chargeFee: 15000 },
];

export const ADVANCE_CUSTOMERS = [
  { name: "Amina Juma", phone: "0711234567", branch: "Kakonko" },
  { name: "Baraka Mushi", phone: "0766112233", branch: "Headquarters" },
  { name: "Catherine Massawe", phone: "0754889900", branch: "Headquarters" },
  { name: "Daniel Kessy", phone: "0713445566", branch: "Headquarters" },
  { name: "Esther Mollel", phone: "0784220011", branch: "Kakonko" },
  { name: "Frank Urio", phone: "0755330022", branch: "NEW KALENGE" },
  { name: "Grace Nyamburi", phone: "0692110044", branch: "Missenyi" },
  { name: "Hamisi Salum", phone: "0621009988", branch: "Test" },
  { name: "Irene Kimaro", phone: "0688774411", branch: "Kakonko" },
  { name: "Joseph Mwakalinga", phone: "0745662200", branch: "NEW KALENGE" },
] as const;

/*
 * The advance book. Each row's `interest` is its category rate applied to the
 * principal, so the Interest column and the category table agree.
 *
 * The six screens are filters over this one list:
 *   Requested  → status "requested"
 *   Approved    → status "approved"
 *   Active     → status "active"
 *   Repayment  → status "active" or "repaid" (anything with money against it)
 */
export const MOCK_SALARY_ADVANCES: SalaryAdvance[] = [
  {
    id: "adv-1", reference: "SA-2026-0031", customerName: "Amina Juma", phone: "0711234567",
    branch: "Kakonko", categoryId: "cat-2", categoryName: "Standard Advance",
    loanAmount: 600000, interest: 60000, paidAmount: 0, chargeFee: 5000,
    status: "requested", date: "2026-07-28", overdueDays: 0,
  },
  {
    id: "adv-2", reference: "SA-2026-0030", customerName: "Baraka Mushi", phone: "0766112233",
    branch: "Headquarters", categoryId: "cat-1", categoryName: "Mini Advance",
    loanAmount: 200000, interest: 10000, paidAmount: 0, chargeFee: 2000,
    status: "requested", date: "2026-07-28", overdueDays: 0,
  },
  {
    id: "adv-3", reference: "SA-2026-0029", customerName: "Frank Urio", phone: "0755330022",
    branch: "NEW KALENGE", categoryId: "cat-4", categoryName: "Emergency Advance",
    loanAmount: 350000, interest: 52500, paidAmount: 0, chargeFee: 3000,
    status: "requested", date: "2026-07-27", overdueDays: 0,
  },
  {
    id: "adv-4", reference: "SA-2026-0028", customerName: "Catherine Massawe", phone: "0754889900",
    branch: "Headquarters", categoryId: "cat-3", categoryName: "Senior Advance",
    loanAmount: 1500000, interest: 180000, paidAmount: 0, chargeFee: 10000,
    status: "approved", date: "2026-07-27", overdueDays: 0,
  },
  {
    id: "adv-5", reference: "SA-2026-0027", customerName: "Daniel Kessy", phone: "0713445566",
    branch: "Headquarters", categoryId: "cat-2", categoryName: "Standard Advance",
    loanAmount: 800000, interest: 80000, paidAmount: 0, chargeFee: 5000,
    status: "approved", date: "2026-07-26", overdueDays: 0,
  },
  {
    id: "adv-6", reference: "SA-2026-0026", customerName: "Esther Mollel", phone: "0784220011",
    branch: "Kakonko", categoryId: "cat-1", categoryName: "Mini Advance",
    loanAmount: 250000, interest: 12500, paidAmount: 100000, chargeFee: 2000,
    status: "active", date: "2026-07-20", overdueDays: 0,
  },
  {
    id: "adv-7", reference: "SA-2026-0025", customerName: "Grace Nyamburi", phone: "0692110044",
    branch: "Missenyi", categoryId: "cat-2", categoryName: "Standard Advance",
    loanAmount: 500000, interest: 50000, paidAmount: 150000, chargeFee: 5000,
    status: "active", date: "2026-07-12", overdueDays: 9,
  },
  {
    id: "adv-8", reference: "SA-2026-0024", customerName: "Hamisi Salum", phone: "0621009988",
    branch: "Test", categoryId: "cat-3", categoryName: "Senior Advance",
    loanAmount: 1200000, interest: 144000, paidAmount: 600000, chargeFee: 10000,
    status: "active", date: "2026-07-05", overdueDays: 23,
  },
  {
    id: "adv-9", reference: "SA-2026-0023", customerName: "Irene Kimaro", phone: "0688774411",
    branch: "Kakonko", categoryId: "cat-4", categoryName: "Emergency Advance",
    loanAmount: 300000, interest: 45000, paidAmount: 200000, chargeFee: 3000,
    status: "active", date: "2026-06-30", overdueDays: 0,
  },
  {
    id: "adv-10", reference: "SA-2026-0022", customerName: "Joseph Mwakalinga", phone: "0745662200",
    branch: "NEW KALENGE", categoryId: "cat-1", categoryName: "Mini Advance",
    loanAmount: 150000, interest: 7500, paidAmount: 157500, chargeFee: 2000,
    status: "repaid", date: "2026-06-25", overdueDays: 0,
  },
  {
    id: "adv-11", reference: "SA-2026-0021", customerName: "Amina Juma", phone: "0711234567",
    branch: "Kakonko", categoryId: "cat-1", categoryName: "Mini Advance",
    loanAmount: 100000, interest: 5000, paidAmount: 105000, chargeFee: 2000,
    status: "repaid", date: "2026-06-18", overdueDays: 0,
  },
  {
    id: "adv-12", reference: "SA-2026-0020", customerName: "Baraka Mushi", phone: "0766112233",
    branch: "Headquarters", categoryId: "cat-5", categoryName: "Management Advance",
    loanAmount: 4000000, interest: 320000, paidAmount: 4320000, chargeFee: 15000,
    status: "repaid", date: "2026-06-10", overdueDays: 0,
  },
];

/*
 * Individual repayments, for the Salary Advance Paid List. These reconcile
 * against the book: the total paid per customer here equals that customer's
 * paidAmount above.
 */
export const MOCK_ADVANCE_PAYMENTS: SalaryAdvancePayment[] = [
  { id: "pay-1", branch: "Kakonko", customerName: "Esther Mollel", amount: 100000, date: "2026-07-27" },
  { id: "pay-2", branch: "Missenyi", customerName: "Grace Nyamburi", amount: 150000, date: "2026-07-26" },
  { id: "pay-3", branch: "Test", customerName: "Hamisi Salum", amount: 400000, date: "2026-07-24" },
  { id: "pay-4", branch: "Test", customerName: "Hamisi Salum", amount: 200000, date: "2026-07-12" },
  { id: "pay-5", branch: "Kakonko", customerName: "Irene Kimaro", amount: 200000, date: "2026-07-10" },
  { id: "pay-6", branch: "NEW KALENGE", customerName: "Joseph Mwakalinga", amount: 157500, date: "2026-07-08" },
  { id: "pay-7", branch: "Kakonko", customerName: "Amina Juma", amount: 105000, date: "2026-06-30" },
  { id: "pay-8", branch: "Headquarters", customerName: "Baraka Mushi", amount: 4320000, date: "2026-06-28" },
];
