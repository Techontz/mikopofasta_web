/**
 * The Report tab, transcribed from the captures.
 *
 * Thirteen screens, captured in one pass. This file holds what they printed;
 * `lib/legacy/source.ts` holds everything transcribed before them, and the two
 * follow the same rule:
 *
 *   If it was not visible on a legacy screen, it does not belong here.
 *
 * Six of the thirteen were captured with rows in them and are transcribed
 * verbatim, including figures that do not add up — see the notes on each. The
 * other seven were captured empty; their columns are recorded and their bodies
 * are not, because an empty table is what the old system shows.
 *
 * Legacy misspellings in *values* are preserved. Misspellings in *headings*
 * ("Pripical", "Intrest", "Satart date", "Penart Amount", "Wright-off") are
 * corrected where this app draws the heading, and noted where the correction
 * might hide something.
 */

/* ------------------------------------------------ Branchwise Loan Summary */

/**
 * Source: Branch Wise Report (/admin/blanchiwise_report).
 *
 * The most valuable capture in the set. Six branches, and every one of the
 * eight columns sums exactly to its printed TOTAL — which makes this the only
 * legacy screen that proves its own completeness. That is why LEGACY_BRANCHES
 * could finally be extended with confidence.
 */
export const LEGACY_BRANCHWISE = [
  { branch: "HEAD OFFICE", totalReceivable: 1_858_000, receivablePrincipal: 1_300_000, receivableInterest: 558_000, totalReceived: 434_000, receivedPrincipal: 19_654, receivedInterest: 6_346, totalPending: 1_424_000, reserve: 669 },
  { branch: "KAKONKO", totalReceivable: 39_593_500, receivablePrincipal: 27_375_000, receivableInterest: 12_218_500, totalReceived: 13_660_451, receivedPrincipal: 9_298_174, receivedInterest: 4_362_277, totalPending: 25_933_049, reserve: 872_455 },
  { branch: "LINDI", totalReceivable: 610_760, receivablePrincipal: 437_000, receivableInterest: 173_760, totalReceived: 260_000, receivedPrincipal: 200_000, receivedInterest: 60_000, totalPending: 350_760, reserve: 6_000 },
  { branch: "MISSENYI", totalReceivable: 15_963_887, receivablePrincipal: 11_288_888, receivableInterest: 4_674_999, totalReceived: 11_050_000, receivedPrincipal: 7_468_866, receivedInterest: 3_581_134, totalPending: 4_913_887, reserve: 516_226 },
  { branch: "NEW KALENGE", totalReceivable: 3_462_000, receivablePrincipal: 2_840_000, receivableInterest: 622_000, totalReceived: 452_000, receivedPrincipal: 339_000, receivedInterest: 113_000, totalPending: 3_010_000, reserve: 0 },
  { branch: "TEST", totalReceivable: 240_000, receivablePrincipal: 200_000, receivableInterest: 40_000, totalReceived: 125_000, receivedPrincipal: 100_000, receivedInterest: 25_000, totalPending: 115_000, reserve: 4_500 },
] as const;

/**
 * What the screen prints on its TOTAL row.
 *
 * Kept beside the rows rather than derived, precisely so the two can be
 * compared: these are the figures to check a migration against.
 */
export const LEGACY_BRANCHWISE_TOTALS = {
  totalReceivable: 61_728_147,
  receivablePrincipal: 43_440_888,
  receivableInterest: 18_287_259,
  totalReceived: 25_981_451,
  receivedPrincipal: 17_425_694,
  receivedInterest: 8_147_757,
  totalPending: 35_746_696,
  reserve: 1_399_850,
} as const;

/* ------------------------------------------------------------ Loan Repayment */

/**
 * Source: Loan Repayment (/admin/repaymant_data) — page 1 of 3, ten of
 * twenty-six rows.
 *
 * Interest is exactly principal × rate on every row, confirming simple interest
 * again. Branch casing here is mixed ("Missenyi", "Head office", "NEW KALENGE")
 * where other screens upper-case the same branches — reproduced as found.
 */
export const LEGACY_LOAN_REPAYMENTS = [
  { customerName: "Amosi Lukasi Juma", branch: "Missenyi", loanAc: "83465213007549", principal: 500_000, interest: 300_000, total: 800_000, duration: "Monthly", repayments: 5, withdrawalDate: "2023-07-14", endDate: "2023-12-11" },
  { customerName: "amoss chaina marwa", branch: "Missenyi", loanAc: "66040592198238", principal: 200_000, interest: 60_000, total: 260_000, duration: "Weekly", repayments: 3, withdrawalDate: "2023-07-13", endDate: "2023-08-03" },
  { customerName: "BATURE MSUKA ANTONY", branch: "Missenyi", loanAc: "46582080736517", principal: 300_000, interest: 72_000, total: 372_000, duration: "Monthly", repayments: 2, withdrawalDate: "2023-09-24", endDate: "2023-11-23" },
  { customerName: "cate mwita mwita", branch: "NEW KALENGE", loanAc: "07368856942132", principal: 20_000, interest: 6_000, total: 26_000, duration: "Weekly", repayments: 1, withdrawalDate: "2026-03-03", endDate: "2026-03-10" },
  { customerName: "CHACHA DISIMAS MCHAINA", branch: "Kakonko", loanAc: "84937564205326", principal: 70_000, interest: 21_000, total: 91_000, duration: "Weekly", repayments: 2, withdrawalDate: "2023-07-19", endDate: "2023-08-02" },
  { customerName: "FRANK PAUL JUMA", branch: "Kakonko", loanAc: "01266801379472", principal: 50_000, interest: 15_000, total: 65_000, duration: "Weekly", repayments: 2, withdrawalDate: "2023-07-19", endDate: "2023-08-02" },
  { customerName: "GABRIEL GABINUS JOACKIM", branch: "Missenyi", loanAc: "60527531344982", principal: 200_000, interest: 24_000, total: 224_000, duration: "Monthly", repayments: 1, withdrawalDate: "2023-09-24", endDate: "2023-10-24" },
  { customerName: "GEORGE ALEX ASUNGA", branch: "Missenyi", loanAc: "74806392631958", principal: 400_000, interest: 120_000, total: 520_000, duration: "Weekly", repayments: 4, withdrawalDate: "2023-09-24", endDate: "2023-10-22" },
  { customerName: "habakuki mwita mseti", branch: "Head office", loanAc: "10745812235039", principal: 300_000, interest: 108_000, total: 408_000, duration: "Monthly", repayments: 3, withdrawalDate: "2023-06-19", endDate: "2023-09-17" },
  { customerName: "habakuki mwita mseti", branch: "Head office", loanAc: "80168235046793", principal: 10_000, interest: 3_000, total: 13_000, duration: "Weekly", repayments: 4, withdrawalDate: "2023-06-19", endDate: "2023-07-17" },
] as const;

export const LEGACY_LOAN_REPAYMENT_TOTALS = {
  principal: 11_830_000,
  interest: 4_913_000,
  total: 16_743_000,
  rowCount: 26,
} as const;

/* --------------------------------------------------------------- Default Loan */

/**
 * Source: Default Loan (/admin/get_outstand_loan) — page 1 of 2, ten of
 * seventeen rows.
 *
 * Row 6 is worth a second look: a 3,360,000 loan over ONE monthly instalment,
 * with 1,300,000 remaining and nothing paid this month. Three of those four
 * figures cannot all be true at once. Transcribed as printed — a report whose
 * arithmetic is wrong is exactly what a migration needs to find.
 */
export const LEGACY_DEFAULT_LOANS = [
  { row: 1, branch: "MISSENYI", customerName: "KIRARYO KIRARYO BAITA", phone: "255782828429", amount: 130_000, restoration: 130_000, duration: "Weekly", repayments: 1, paidThisMonth: 0, remain: 130_000, startDate: "2023-07-14", endDate: "2023-07-21" },
  { row: 2, branch: "MISSENYI", customerName: "MAJIGE KATALAMA HAPPY", phone: "255744031270", amount: 65_000, restoration: 65_000, duration: "Weekly", repayments: 1, paidThisMonth: 0, remain: 65_000, startDate: "2023-07-19", endDate: "2023-07-26" },
  { row: 3, branch: "MISSENYI", customerName: "ANASTAZIA MATIKO MATIKO", phone: "255782828429", amount: 260_000, restoration: 65_000, duration: "Weekly", repayments: 4, paidThisMonth: 0, remain: 260_000, startDate: "2023-07-14", endDate: "2023-08-11" },
  { row: 4, branch: "MISSENYI", customerName: "MATAPUTAPU JUMA KONTAWA", phone: "255743792048", amount: 372_000, restoration: 186_000, duration: "Monthly", repayments: 2, paidThisMonth: 0, remain: 72_000, startDate: "2023-09-24", endDate: "2023-11-23" },
  { row: 5, branch: "MISSENYI", customerName: "MARIA MASAWE JUMA", phone: "255745586163", amount: 1_184_000, restoration: 296_000, duration: "Monthly", repayments: 4, paidThisMonth: 0, remain: 932_000, startDate: "2023-10-21", endDate: "2024-02-18" },
  { row: 6, branch: "KAKONKO", customerName: "JUMA PAUL PETER", phone: "255755897942", amount: 3_360_000, restoration: 3_360_000, duration: "Monthly", repayments: 1, paidThisMonth: 0, remain: 1_300_000, startDate: "2024-05-23", endDate: "2024-06-22" },
  { row: 7, branch: "KAKONKO", customerName: "JUMA PAUL PETER", phone: "255755897942", amount: 1_360_000, restoration: 453_333, duration: "Monthly", repayments: 3, paidThisMonth: 0, remain: 1_360_000, startDate: "2024-05-22", endDate: "2024-08-20" },
  { row: 8, branch: "KAKONKO", customerName: "FRANK PAUL JUMA", phone: "255755897942", amount: 272_000, restoration: 90_667, duration: "Monthly", repayments: 3, paidThisMonth: 0, remain: 272_000, startDate: "2024-08-19", endDate: "2024-11-17" },
  { row: 9, branch: "KAKONKO", customerName: "CHACHA DISIMAS MCHAINA", phone: "255744564606", amount: 740_000, restoration: 185_000, duration: "Monthly", repayments: 4, paidThisMonth: 0, remain: 100_000, startDate: "2024-08-19", endDate: "2024-12-17" },
  { row: 10, branch: "KAKONKO", customerName: "ALECIA MVUGWA MASELE", phone: "255789773335", amount: 520_000, restoration: 132_500, duration: "Monthly", repayments: 4, paidThisMonth: 0, remain: 520_000, startDate: "2024-08-21", endDate: "2024-12-19" },
] as const;

export const LEGACY_DEFAULT_LOAN_TOTALS = {
  paidThisMonth: 350_000,
  remain: 14_482_549,
  rowCount: 17,
} as const;

/* ------------------------------------------------------------ Loan Collection */

export type LegacyCollectionStatus = "DONE" | "DISBURSED" | "DEFAULT";

/**
 * Source: Loan Collection (/admin/loan_collection) — ten rows, and the TOTAL
 * row matches Branchwise Loan Summary exactly on three of its four figures.
 *
 * Row 8 carries a NEGATIVE Remain Amount: a 26,000 loan against which 31,000
 * was collected, leaving −5,000. The customer overpaid, and the legacy report
 * prints the overpayment as a negative rather than as a credit. Preserved.
 *
 * Row 9 has no End Date at all and sits at DISBURSED, which is what an
 * uncollected loan looks like on this screen.
 */
export const LEGACY_LOAN_COLLECTIONS = [
  { row: 1, branch: "HEAD OFFICE", customerName: "HABAKUKI MWITA MSETI", employee: "ADMIN", amount: 408_000, collection: 136_000, paid: 408_000, remain: 0, penalty: 0, endDate: "2023-09-17", status: "DONE" as LegacyCollectionStatus },
  { row: 2, branch: "HEAD OFFICE", customerName: "HABAKUKI MWITA MSETI", employee: "ADMIN", amount: 13_000, collection: 3_250, paid: 13_000, remain: 0, penalty: 0, endDate: "2023-07-17", status: "DONE" as LegacyCollectionStatus },
  { row: 3, branch: "HEAD OFFICE", customerName: "HABAKUKI MWITA MSETI", employee: "ADMIN", amount: 13_000, collection: 6_500, paid: 13_000, remain: 0, penalty: 0, endDate: "2023-07-24", status: "DONE" as LegacyCollectionStatus },
  { row: 4, branch: "MISSENYI", customerName: "MADAKI MADUHU JAHAZI", employee: "TEST", amount: 960_000, collection: 192_000, paid: 960_000, remain: 0, penalty: 0, endDate: "2023-12-10", status: "DONE" as LegacyCollectionStatus },
  { row: 5, branch: "KAKONKO", customerName: "PETER JUMA JOERI", employee: "ADMIN", amount: 650_000, collection: 162_500, paid: 650_000, remain: 0, penalty: 0, endDate: "2023-08-10", status: "DONE" as LegacyCollectionStatus },
  { row: 6, branch: "MISSENYI", customerName: "AMOSS CHAINA MARWA", employee: "TEST", amount: 260_000, collection: 86_667, paid: 260_000, remain: 0, penalty: 0, endDate: "2023-08-03", status: "DONE" as LegacyCollectionStatus },
  { row: 7, branch: "LINDI", customerName: "SALUMU ROBERT ONYANGO", employee: "ADMIN", amount: 260_000, collection: 130_000, paid: 260_000, remain: 0, penalty: 0, endDate: "2023-07-28", status: "DONE" as LegacyCollectionStatus },
  { row: 8, branch: "NEW KALENGE", customerName: "CATE MWITA MWITA", employee: "HPP", amount: 26_000, collection: 31_000, paid: 31_000, remain: -5_000, penalty: 0, endDate: "2026-03-10", status: "DONE" as LegacyCollectionStatus },
  { row: 9, branch: "MISSENYI", customerName: "JAMES MTURI KIWEMBE", employee: "TEST", amount: 558_000, collection: 279_000, paid: 0, remain: 558_000, penalty: 0, endDate: null, status: "DISBURSED" as LegacyCollectionStatus },
  { row: 10, branch: "KAKONKO", customerName: "JUMA PAUL PETER", employee: "MAGE11", amount: 6_000_000, collection: 501_667, paid: 1_004_451, remain: 4_995_549, penalty: 1_103_663, endDate: "2025-08-16", status: "DEFAULT" as LegacyCollectionStatus },
] as const;

export const LEGACY_LOAN_COLLECTION_TOTALS = {
  amount: 61_728_147,
  paid: 25_981_451,
  remain: 35_746_696,
  penalty: 2_560_162,
} as const;

/**
 * Employee codes, from the Loan Collection screen's Employee column.
 *
 * Real values, and nothing like the full names the registration form's Employee
 * select carries — these look like login codes rather than staff names, which
 * means the two screens are showing different fields of the same person.
 */
export const LEGACY_EMPLOYEE_CODES = ["ADMIN", "TEST", "HPP", "MAGE11"] as const;

/* --------------------------------------------------------------- Daily Report */

/**
 * Source: Daily Report (/admin/daily_report), captured for July 30 2026.
 *
 * Three bands: money in, money out, and the closing position. The screen prints
 * its money-in TOTAL in green and its money-out TOTAL in red, which is the only
 * use of colour as meaning anywhere in the captures.
 *
 * It does not foot. Opening 0 plus in 0 less out 20,000 is −20,000, not the
 * 33,435,883 printed as CLOSING — the same figure the Teller screen prints as a
 * closing balance against a customer with no movement. Both are transcribed;
 * neither is repaired here, because whatever produces that number is a thing
 * the migration has to find rather than reproduce.
 */
export const LEGACY_DAILY_REPORT = {
  date: "July, 30, 2026",
  inflows: [
    { label: "OPENING", amount: 0, heading: true },
    { label: "CAPITAL", amount: 0 },
    { label: "TRANSFER", amount: 0 },
    { label: "DEPOSIT", amount: 0 },
    { label: "AGENT", amount: 0 },
    { label: "SAVING DEPOSIT", amount: 0 },
    { label: "DEBT PENDING", amount: 0 },
    { label: "LOAN FEE", amount: 0 },
    /* "PENARTY" is the legacy spelling of Penalty. */
    { label: "PENALTY", amount: 0 },
  ],
  inflowTotal: 0,
  outflows: [
    { label: "LOAN WITHDRAWAL", amount: 0 },
    { label: "SAVING WITHDRAWAL", amount: 0 },
    { label: "DEBT PENDING", amount: 20_000 },
    { label: "EXPENSES", amount: 0 },
    { label: "BANK", amount: 0 },
    { label: "TRANSFER", amount: 0 },
  ],
  outflowTotal: 20_000,
  closing: 33_435_883,
} as const;

/* -------------------------------------------------------- Customer Development */

/**
 * Source: Customer Development (/admin/marked_customer_list) — all three rows.
 *
 * "Showing 1 to 3 of 3 entries", so this list is complete. It names two
 * customers no other capture mentions, and confirms SAMWEL LAZARO TONYONGO's
 * branch as Kakonko — the profile capture did not show a branch.
 */
export const LEGACY_MARKED_CUSTOMERS = [
  { row: 1, customerId: "C2024051941", name: "DANIEL CHACHA WEGESA", age: 32, gender: "male", phone: "255682212660", branch: "Kakonko" },
  { row: 2, customerId: "C2024081991", name: "MAIMUNA HAMIS ALWATAN", age: 32, gender: "female", phone: "255788997723", branch: "Kakonko" },
  { row: 3, customerId: "C2026072979", name: "SAMWEL LAZARO TONYONGO", age: 22, gender: "male", phone: "255747436817", branch: "Kakonko" },
] as const;

/* ------------------------------------------------------------- filter strips */

/**
 * The period strips, which differ per screen and are recorded per screen.
 *
 * Loan Pending and Today Receivable have NO "All" — they open on a period and
 * cannot show everything. Default Loan and Today Received do have it. That is
 * not a capture inconsistency; it is four screens with three different strips,
 * and reproducing it exactly is the point.
 */
export const LEGACY_REPORT_PERIODS = {
  withAll: ["All", "Monthly", "Weekly", "Daily"],
  withoutAll: ["Monthly", "Weekly", "Daily"],
  /* Write-off's strip is not periods at all — it is three states of a bad debt. */
  writeOff: ["Write-off loan", "Bad Debit", "Bad Debit Done"],
} as const;
