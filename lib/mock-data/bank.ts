import type {
  BankAccountRecord,
  BankExpense,
  BankTransaction,
  BankTransfer,
  ExpenseRequest,
  PayrollRow,
} from "@/types/bank";

/**
 * Placeholder state for the Bank module.
 *
 * Every screen in this module is built against the types in types/bank.ts; the
 * rows below stand in until an endpoint serves them. Three deliberate choices:
 *
 *   - Dates are fixed strings, never `new Date()`. A fixture that moves with
 *     the clock makes a server-rendered page disagree with its own hydration.
 *   - Figures are internally consistent — an account's balance is its opening
 *     balance plus its movement, a transfer's fee is separate from its amount,
 *     a payslip's net is its gross less its deductions. A screen that adds up
 *     is the only way to tell a layout bug from a maths bug.
 *   - Names and branches reuse the ones already seeded elsewhere in the app so
 *     the module reads as part of the same system.
 *
 * `MOCK_` prefix and this file's location mark it as fixture data, matching the
 * convention used by the other not-yet-served screens.
 */

export const BANK_NAMES = ["NMB", "CRDB", "NBC", "Equity", "Absa"] as const;
export const BRANCHES = ["Headquarters", "Kakonko", "Missenyi", "NEW KALENGE", "Test"] as const;
export const DEPARTMENTS = ["Operations", "Credit", "Finance", "Field", "Administration"] as const;
export const EXPENSE_CATEGORIES = [
  "MISHAHARA",
  "Bank Charges",
  "Stationery",
  "Transport",
  "Utilities",
  "Rent",
] as const;
export const TRANSFER_REASONS = [
  "Branch float top-up",
  "Salary advance funding",
  "Disbursement funding",
  "Operational expenses",
  "Bank charges settlement",
] as const;

export const MOCK_BANK_ACCOUNT_RECORDS: BankAccountRecord[] = [
  {
    id: "acc-1",
    bankName: "NMB",
    accountName: "Mikopofasta Main Collection",
    accountNumber: "20110045781",
    branch: "Headquarters",
    currency: "TZS",
    openingBalance: 12000000,
    balance: 16200000,
    status: "active",
    description: "Primary collection account for all branches.",
    todayDeposit: 4850000,
    todayWithdrawal: 650000,
  },
  {
    id: "acc-2",
    bankName: "CRDB",
    accountName: "Mikopofasta Disbursement",
    accountNumber: "01J1097654300",
    branch: "Headquarters",
    currency: "TZS",
    openingBalance: 8000000,
    balance: 2000000,
    status: "active",
    description: "Loan disbursement account.",
    todayDeposit: 0,
    todayWithdrawal: 6000000,
  },
  {
    id: "acc-3",
    bankName: "NBC",
    accountName: "Mikopofasta Salary Advance",
    accountNumber: "011203004455",
    branch: "Headquarters",
    currency: "TZS",
    openingBalance: 3000000,
    balance: 3420000,
    status: "active",
    description: "Staff salary advance float.",
    todayDeposit: 500000,
    todayWithdrawal: 80000,
  },
  {
    id: "acc-4",
    bankName: "NMB",
    accountName: "Kakonko Branch Operations",
    accountNumber: "20110088912",
    branch: "Kakonko",
    currency: "TZS",
    openingBalance: 1500000,
    balance: 1730000,
    status: "active",
    description: null,
    todayDeposit: 310000,
    todayWithdrawal: 80000,
  },
  {
    id: "acc-5",
    bankName: "Equity",
    accountName: "Missenyi Branch Operations",
    accountNumber: "30001122334",
    branch: "Missenyi",
    currency: "TZS",
    openingBalance: 900000,
    balance: 640000,
    status: "inactive",
    description: "Dormant since the branch merged into Kakonko.",
    todayDeposit: 0,
    todayWithdrawal: 0,
  },
  {
    id: "acc-6",
    bankName: "Absa",
    accountName: "Mikopofasta USD Reserve",
    accountNumber: "77220033115",
    branch: "Headquarters",
    currency: "USD",
    openingBalance: 25000,
    balance: 27400,
    status: "active",
    description: "Foreign currency reserve.",
    todayDeposit: 2400,
    todayWithdrawal: 0,
  },
];

export const MOCK_BANK_TRANSACTIONS: BankTransaction[] = [
  {
    id: "txn-1", reference: "BT-2026-0041", date: "2026-07-28", bankName: "NMB",
    accountName: "Mikopofasta Main Collection", accountNumber: "20110045781", branch: "Kakonko",
    type: "withdrawal", amount: 110000, requestedBy: "Amina Juma", status: "pending",
    decidedBy: null, decidedAt: null, note: "Loan fee settlement.",
  },
  {
    id: "txn-2", reference: "BT-2026-0040", date: "2026-07-28", bankName: "CRDB",
    accountName: "Mikopofasta Disbursement", accountNumber: "01J1097654300", branch: "Headquarters",
    type: "transfer", amount: 6000000, requestedBy: "Baraka Mushi", status: "pending",
    decidedBy: null, decidedAt: null, note: "Daily disbursement batch.",
  },
  {
    id: "txn-3", reference: "BT-2026-0039", date: "2026-07-27", bankName: "NMB",
    accountName: "Mikopofasta Main Collection", accountNumber: "20110045781", branch: "Headquarters",
    type: "deposit", amount: 4850000, requestedBy: "Catherine Massawe", status: "approved",
    decidedBy: "Daniel Kessy", decidedAt: "2026-07-27", note: null,
  },
  {
    id: "txn-4", reference: "BT-2026-0038", date: "2026-07-27", bankName: "NBC",
    accountName: "Mikopofasta Salary Advance", accountNumber: "011203004455", branch: "Headquarters",
    type: "transfer", amount: 500000, requestedBy: "Esther Mollel", status: "approved",
    decidedBy: "Daniel Kessy", decidedAt: "2026-07-27", note: "Advance float top-up.",
  },
  {
    id: "txn-5", reference: "BT-2026-0037", date: "2026-07-26", bankName: "NMB",
    accountName: "Kakonko Branch Operations", accountNumber: "20110088912", branch: "Kakonko",
    type: "charge", amount: 12000, requestedBy: "Frank Urio", status: "approved",
    decidedBy: "Daniel Kessy", decidedAt: "2026-07-26", note: "Monthly ledger fees.",
  },
  {
    id: "txn-6", reference: "BT-2026-0036", date: "2026-07-25", bankName: "Equity",
    accountName: "Missenyi Branch Operations", accountNumber: "30001122334", branch: "Missenyi",
    type: "withdrawal", amount: 260000, requestedBy: "Grace Nyamburi", status: "rejected",
    decidedBy: "Daniel Kessy", decidedAt: "2026-07-25", note: "Branch is dormant.",
  },
  {
    id: "txn-7", reference: "BT-2026-0035", date: "2026-07-24", bankName: "CRDB",
    accountName: "Mikopofasta Disbursement", accountNumber: "01J1097654300", branch: "NEW KALENGE",
    type: "deposit", amount: 1250000, requestedBy: "Hamisi Salum", status: "approved",
    decidedBy: "Daniel Kessy", decidedAt: "2026-07-24", note: null,
  },
  {
    id: "txn-8", reference: "BT-2026-0034", date: "2026-07-23", bankName: "NMB",
    accountName: "Mikopofasta Main Collection", accountNumber: "20110045781", branch: "Test",
    type: "withdrawal", amount: 92000, requestedBy: "Irene Kimaro", status: "approved",
    decidedBy: "Daniel Kessy", decidedAt: "2026-07-23", note: "Payroll settlement.",
  },
];

export const MOCK_BANK_TRANSFERS: BankTransfer[] = [
  {
    id: "trf-1", reference: "TRF-0021", kind: "branch",
    fromAccount: "NMB — Mikopofasta Main Collection", toAccount: "Kakonko",
    amount: 1500000, chargeFee: 4000, reason: "Branch float top-up",
    description: "Weekly float for field collections.", date: "2026-07-28",
    status: "completed", requestedBy: "Amina Juma",
  },
  {
    id: "trf-2", reference: "TRF-0020", kind: "branch",
    fromAccount: "NMB — Mikopofasta Main Collection", toAccount: "NEW KALENGE",
    amount: 800000, chargeFee: 3000, reason: "Operational expenses",
    description: null, date: "2026-07-27", status: "pending", requestedBy: "Baraka Mushi",
  },
  {
    id: "trf-3", reference: "TRF-0019", kind: "branch",
    fromAccount: "CRDB — Mikopofasta Disbursement", toAccount: "Missenyi",
    amount: 250000, chargeFee: 2500, reason: "Branch float top-up",
    description: "Reversed — branch dormant.", date: "2026-07-25",
    status: "cancelled", requestedBy: "Grace Nyamburi",
  },
  {
    id: "trf-4", reference: "TRF-0018", kind: "salary_advance",
    fromAccount: "NMB — Mikopofasta Main Collection", toAccount: "NBC — Mikopofasta Salary Advance",
    amount: 500000, chargeFee: 2000, reason: "Salary advance funding",
    description: "July advance float.", date: "2026-07-27",
    status: "completed", requestedBy: "Esther Mollel",
  },
  {
    id: "trf-5", reference: "TRF-0017", kind: "salary_advance",
    fromAccount: "NMB — Mikopofasta Main Collection", toAccount: "CRDB — Mikopofasta Disbursement",
    amount: 6000000, chargeFee: 8000, reason: "Disbursement funding",
    description: "Daily disbursement batch cover.", date: "2026-07-26",
    status: "completed", requestedBy: "Baraka Mushi",
  },
  {
    id: "trf-6", reference: "TRF-0016", kind: "salary_advance",
    fromAccount: "NBC — Mikopofasta Salary Advance", toAccount: "CRDB — Mikopofasta Disbursement",
    amount: 300000, chargeFee: 1500, reason: "Disbursement funding",
    description: null, date: "2026-07-24", status: "pending", requestedBy: "Frank Urio",
  },
];

export const MOCK_BANK_EXPENSES: BankExpense[] = [
  {
    id: "exp-1", category: "MISHAHARA", bankName: "NMB",
    accountName: "Mikopofasta Main Collection", amount: 92000,
    description: "July payroll settlement.", receiptName: "payroll-jul-2026.pdf",
    date: "2026-07-28", recordedBy: "Irene Kimaro",
  },
  {
    id: "exp-2", category: "Bank Charges", bankName: "CRDB",
    accountName: "Mikopofasta Disbursement", amount: 12000,
    description: "Monthly ledger fees.", receiptName: null,
    date: "2026-07-26", recordedBy: "Frank Urio",
  },
  {
    id: "exp-3", category: "Stationery", bankName: "NMB",
    accountName: "Kakonko Branch Operations", amount: 45000,
    description: "Receipt books and printer toner.", receiptName: "stationery-0712.jpg",
    date: "2026-07-22", recordedBy: "Amina Juma",
  },
  {
    id: "exp-4", category: "Transport", bankName: "NMB",
    accountName: "Kakonko Branch Operations", amount: 60000,
    description: "Field collection fuel.", receiptName: "fuel-0719.jpg",
    date: "2026-07-19", recordedBy: "Hamisi Salum",
  },
  {
    id: "exp-5", category: "Utilities", bankName: "NBC",
    accountName: "Mikopofasta Salary Advance", amount: 80000,
    description: "Office electricity, July.", receiptName: null,
    date: "2026-07-15", recordedBy: "Catherine Massawe",
  },
];

export const MOCK_EXPENSE_REQUESTS: ExpenseRequest[] = [
  {
    id: "req-1", requestNo: "REQ-2026-0114", category: "Transport", requestedBy: "Amina Juma",
    branch: "Kakonko", amount: 180000, status: "pending", requestedDate: "2026-07-28",
    comment: "Field visits, week 31.",
  },
  {
    id: "req-2", requestNo: "REQ-2026-0113", category: "Stationery", requestedBy: "Baraka Mushi",
    branch: "Headquarters", amount: 95000, status: "pending", requestedDate: "2026-07-27",
    comment: null,
  },
  {
    id: "req-3", requestNo: "REQ-2026-0112", category: "Utilities", requestedBy: "Catherine Massawe",
    branch: "Headquarters", amount: 240000, status: "approved", requestedDate: "2026-07-25",
    comment: "Approved against the July utilities budget.",
  },
  {
    id: "req-4", requestNo: "REQ-2026-0111", category: "Rent", requestedBy: "Daniel Kessy",
    branch: "NEW KALENGE", amount: 1200000, status: "approved", requestedDate: "2026-07-20",
    comment: "Quarterly office rent.",
  },
  {
    id: "req-5", requestNo: "REQ-2026-0110", category: "Transport", requestedBy: "Grace Nyamburi",
    branch: "Missenyi", amount: 150000, status: "rejected", requestedDate: "2026-07-18",
    comment: "Branch dormant — no field activity.",
  },
  {
    id: "req-6", requestNo: "REQ-2026-0109", category: "Bank Charges", requestedBy: "Frank Urio",
    branch: "Headquarters", amount: 35000, status: "approved", requestedDate: "2026-07-15",
    comment: null,
  },
];

/*
 * Payroll rows. Net is gross less deductions in every row — see payrollTotals,
 * which the screens use rather than a stored figure, so the table always foots.
 */
export const MOCK_PAYROLL_ROWS: PayrollRow[] = [
  {
    id: "pay-1", employee: "Amina Juma", staffNo: "MF-0101", department: "Operations",
    branch: "Kakonko", period: "2026-07", phone: "0711234567", bankName: "CRDB",
    accountNumber: "898657465", salary: 1800000,
    allowances: [{ label: "Airtime", amount: 20000 }],
    deductions: [{ label: "Staff Fund", amount: 180000 }],
    status: "paid", paidOn: "2026-07-28",
    payments: [
      { id: "p-1a", period: "2026-07", paidOn: "2026-07-28", netSalary: 1640000, reference: "PR-2607-0101", status: "paid" },
      { id: "p-1b", period: "2026-06", paidOn: "2026-06-28", netSalary: 1640000, reference: "PR-2606-0101", status: "paid" },
      { id: "p-1c", period: "2026-05", paidOn: "2026-05-28", netSalary: 1615000, reference: "PR-2605-0101", status: "paid" },
    ],
  },
  {
    id: "pay-2", employee: "Baraka Mushi", staffNo: "MF-0102", department: "Credit",
    branch: "Headquarters", period: "2026-07", phone: "0766112233", bankName: "NMB",
    accountNumber: "34576843", salary: 1800000,
    allowances: [{ label: "Airtime", amount: 20000 }],
    deductions: [{ label: "Staff Fund", amount: 180000 }],
    status: "paid", paidOn: "2026-07-28",
    payments: [
      { id: "p-2a", period: "2026-07", paidOn: "2026-07-28", netSalary: 1640000, reference: "PR-2607-0102", status: "paid" },
      { id: "p-2b", period: "2026-06", paidOn: "2026-06-28", netSalary: 1640000, reference: "PR-2606-0102", status: "paid" },
    ],
  },
  {
    id: "pay-3", employee: "Catherine Massawe", staffNo: "MF-0103", department: "Finance",
    branch: "Headquarters", period: "2026-07", phone: "0754889900", bankName: "NMB",
    accountNumber: "20110045999", salary: 1800000,
    allowances: [{ label: "Airtime", amount: 20000 }],
    deductions: [{ label: "Staff Fund", amount: 180000 }],
    status: "paid", paidOn: "2026-07-28",
    payments: [
      { id: "p-3a", period: "2026-07", paidOn: "2026-07-28", netSalary: 1640000, reference: "PR-2607-0103", status: "paid" },
    ],
  },
  {
    id: "pay-4", employee: "Daniel Kessy", staffNo: "MF-0104", department: "Finance",
    branch: "Headquarters", period: "2026-07", phone: "0713445566", bankName: "CRDB",
    accountNumber: "01J1097654311", salary: 1400000,
    allowances: [{ label: "Transport", amount: 50000 }, { label: "Airtime", amount: 20000 }],
    deductions: [{ label: "Staff Fund", amount: 140000 }],
    status: "paid", paidOn: "2026-07-28",
    payments: [
      { id: "p-4a", period: "2026-07", paidOn: "2026-07-28", netSalary: 1330000, reference: "PR-2607-0104", status: "paid" },
    ],
  },
  {
    id: "pay-5", employee: "Esther Mollel", staffNo: "MF-0105", department: "Field",
    branch: "Kakonko", period: "2026-07", phone: "0784220011", bankName: "NBC",
    accountNumber: "011203004488", salary: 800000,
    allowances: [{ label: "Transport", amount: 50000 }, { label: "Airtime", amount: 20000 }],
    deductions: [{ label: "Staff Fund", amount: 80000 }, { label: "Salary Advance", amount: 50000 }],
    status: "pending", paidOn: null,
    payments: [
      { id: "p-5a", period: "2026-06", paidOn: "2026-06-28", netSalary: 740000, reference: "PR-2606-0105", status: "paid" },
    ],
  },
  {
    id: "pay-6", employee: "Frank Urio", staffNo: "MF-0106", department: "Field",
    branch: "NEW KALENGE", period: "2026-07", phone: "0755330022", bankName: "NMB",
    accountNumber: "20110077221", salary: 1000000,
    allowances: [{ label: "Transport", amount: 50000 }, { label: "Airtime", amount: 20000 }],
    deductions: [{ label: "Staff Fund", amount: 100000 }],
    status: "pending", paidOn: null,
    payments: [],
  },
  {
    id: "pay-7", employee: "Grace Nyamburi", staffNo: "MF-0107", department: "Administration",
    branch: "Missenyi", period: "2026-07", phone: "0692110044", bankName: "Equity",
    accountNumber: "30001122888", salary: 740000,
    allowances: [],
    deductions: [],
    status: "pending", paidOn: null,
    payments: [],
  },
  {
    id: "pay-8", employee: "Hamisi Salum", staffNo: "MF-0108", department: "Operations",
    branch: "Test", period: "2026-07", phone: "0621009988", bankName: "NMB",
    accountNumber: "20110099001", salary: 1200000,
    allowances: [{ label: "Airtime", amount: 20000 }],
    deductions: [{ label: "Staff Fund", amount: 120000 }, { label: "Loan", amount: 60000 }],
    status: "paid", paidOn: "2026-07-28",
    payments: [
      { id: "p-8a", period: "2026-07", paidOn: "2026-07-28", netSalary: 1040000, reference: "PR-2607-0108", status: "paid" },
    ],
  },
];

/** Periods present in the payroll fixture, newest first — drives the Month filter. */
export const PAYROLL_PERIODS = ["2026-07", "2026-06", "2026-05"] as const;
