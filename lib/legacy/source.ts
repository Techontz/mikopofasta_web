/**
 * Values transcribed from the legacy mikopofasta.co.tz screens.
 *
 * The frontend half of the transcription. The authoritative copy lives in the
 * API repo at `database/seeders/Legacy/LegacySource.php`, annotated with the
 * screen every value was read from; this file carries the subset the frontend
 * needs before those values arrive over the wire, and the two must agree.
 *
 * The rule is the same on both sides:
 *
 *   If it was not visible on a legacy screen, it does not belong here.
 *
 * Anything the legacy system demonstrably has but that no capture shows is
 * listed in UNOBSERVED. Those lookups are still seeded — with inferred values,
 * from the API repo's `InferredLookups.php` — because an empty dropdown makes
 * the form it sits on unsubmittable, which is a worse outcome than a value that
 * later turns out to be wrong. UNOBSERVED is the record of which seeded values
 * are placeholders and what capture would replace each with the real thing.
 *
 * Legacy spellings are preserved exactly as data. That does not contradict the
 * spelling sweep done across the UI: labels we author are ours to correct, but
 * a lookup value that has to match the old system's records is evidence.
 */

/**
 * Source: Loan Disbursed (NEW KALENGE, all ten rows), Loan Pending Approve
 * (Missenyi, Kakonko) and Bank Account & password (MISSENYI, KAKONKO, TEST).
 *
 * Casing is inconsistent in the legacy data itself, and the bank account screen
 * proves it is inconsistent *per screen* rather than per branch: the same two
 * branches print "Missenyi"/"Kakonko" on the loan lists and
 * "MISSENYI"/"KAKONKO" here. Only one of those can be the stored value, and no
 * capture settles which — so the loan-list casing is kept as the canonical form
 * and the difference is recorded rather than normalised away.
 *
 * TEST is a real row on the bank account list, against a real customer. It is
 * almost certainly a branch somebody created while trying the system out, and
 * it is listed because it exists — a migration that quietly drops the awkward
 * record is how a customer ends up unreachable after go-live.
 *
 * Still NOT provably the full list; the Branch dropdown has never been captured
 * open.
 */
export const LEGACY_BRANCHES = [
  "NEW KALENGE",
  "Missenyi",
  "Kakonko",
  "TEST",
  /*
   * Added from the Branchwise Loan Summary, which is the first capture that
   * enumerates branches rather than mentioning them in passing. Six rows, and
   * it foots — every column sums to its printed TOTAL — so unlike every earlier
   * source this one is provably the complete list.
   */
  "HEAD OFFICE",
  "LINDI",
] as const;

/**
 * Restoration Type / Duration Type / Loan Duration.
 *
 * Source: the Loan Withdrawal filter tabs, which read
 * "All | Monthly | Weekly | Daily | Back". A tab strip enumerates its whole
 * set, which is why this list is complete where the branch list is not.
 */
export const LEGACY_RESTORATION_TYPES = ["Daily", "Weekly", "Monthly"] as const;

/**
 * The seven headquarters accounts, with the balances the legacy system shows.
 *
 * Source: Headquater Account Balance.
 *
 * Provably complete: the seven amounts sum to 8,667,270, exactly the TOTAL the
 * page prints. A missing account would break that, which is what
 * LEGACY_HQ_ACCOUNTS_TOTAL below is for.
 */
export const LEGACY_HQ_ACCOUNTS = [
  { name: "SALARY ADVANCE ACCOUNT", balance: 198_190 },
  { name: "DISBURSEMENT ACCOUNT", balance: 7_184_000 },
  { name: "PENALTY ACCOUNT", balance: 26_390 },
  { name: "INTEREST ACCOUNT", balance: 759_790 },
  { name: "RESERVE ACCOUNT", balance: 221_900 },
  { name: "LOAN FEE ACCOUNT", balance: 97_000 },
  { name: "SAVING ACCOUNT", balance: 180_000 },
] as const;

/** The total printed on the legacy balance screen. */
export const LEGACY_HQ_ACCOUNTS_TOTAL = 8_667_270;

/**
 * Source: Group List — "Showing 1 to 1 of 1 entries".
 *
 * One group. This supersedes the earlier brief's thirty. The legacy Group List
 * has three columns — S/NO., Group Name, Action — so the legacy group record
 * carries no branch, leader, member count or balance of its own.
 */
export const LEGACY_GROUPS = ["WAZURI"] as const;

/** Source: the Loan Status column on Loan Pending Approve. Only this one seen. */
export const LEGACY_LOAN_STATUSES = ["PENDING"] as const;

/** Source: the Customer Status column on Loan Pending Approve. Only this one seen. */
export const LEGACY_CUSTOMER_STATUSES = ["NEW"] as const;

/**
 * Lookups the legacy system demonstrably has, whose contents no captured screen
 * reveals. Each value says what capture would settle it.
 *
 * All of these are seeded and every dropdown has options — these are the ones
 * whose options are inferred rather than transcribed. Kept in code rather than
 * in a document because it is the answer to "is this figure real?", and that
 * question gets asked at the screen, not in the docs folder.
 */
export const UNOBSERVED: Record<string, string> = {
  branches:
    "Four appear across loan and bank-account data, one of them named TEST. Needs the Branch select on the registration form opened, or the branch list screen.",
  visaColumn:
    "The VISA column on Bank Account & password is empty on all ten captured rows, so what it holds — a card number, a flag, a status — is still unknown.",
  employees:
    "The Employee select on the registration form, opened. No employee name appears anywhere in the captures.",
  gender:
    "The Gender select opened, to confirm the legacy label text and casing. Seeded Male/Female, which is almost certainly right.",
  loanTypes: "The Loan Type select on the registration form, opened.",
  customerTypes: "The 'Types of customer' select on the registration form, opened.",
  regions:
    "The Region select opened. Tanzania has 31 regions; which subset the legacy lists is unknown.",
  guarantors: "Registration step 2 ('Aditinal Detail') was never captured.",
  banks: "Registration step 3 ('Passport size & Bank Detail') was never captured.",
  paymentMethods: "The Method column on Loan Withdrawal — that table was captured empty.",
  charger: "The Charger column on both Headquater Transaction screens — both captured empty.",
  staffNames: "The Staff Name column on both Headquater Transaction screens — both captured empty.",
  hqTransactionStatuses: "The status column on the Headquater Transaction screens — both empty.",
  loanStatuses: "Only PENDING seen. The Loan Rejected screen was captured empty.",
  customerStatuses: "Only NEW seen. All Customer was captured with no rows.",
} as const;

/**
 * The eighteen customers the legacy screens name, drawn from the two loan
 * lists.
 *
 * Names are exact, including the two recorded in lower case and the three that
 * look misspelled — a person's name as the system records it is not a spelling
 * error to sweep, and normalising it would stop it matching legacy records.
 *
 * Ten carry a real phone number from Loan Pending Approve. The other eight have
 * none: the All Customer screen would have supplied it and was captured empty.
 */
export const LEGACY_CUSTOMERS = [
  { name: "tumaini c katakuzi", branch: "NEW KALENGE", phone: null },
  { name: "CHRIZESTOM B KATAKUZI", branch: "NEW KALENGE", phone: null },
  { name: "ELISHA M ADAMU", branch: "NEW KALENGE", phone: null },
  { name: "ASHA Z JUMA", branch: "NEW KALENGE", phone: null },
  { name: "HASSAN J SAIDI", branch: "NEW KALENGE", phone: null },
  { name: "ZUENA E HASAN", branch: "NEW KALENGE", phone: null },
  { name: "ALY J JACKSPON", branch: "NEW KALENGE", phone: null },
  { name: "CATHERINI D NTABA", branch: "NEW KALENGE", phone: null },
  { name: "maswi m gachuma", branch: "Missenyi", phone: "255769138896" },
  { name: "EDIGAR J PAUL", branch: "NEW KALENGE", phone: "255712456324" },
  { name: "FARYJALLAH M JOHN", branch: "NEW KALENGE", phone: "255758144234" },
  { name: "JASITIN J LUVANGA", branch: "Kakonko", phone: "255645473537" },
  { name: "EZRA J MBWILO", branch: "Kakonko", phone: "255702635621" },
  { name: "REBECCA P MPPOGOLE", branch: "Kakonko", phone: "255713121681" },
  { name: "REMY I SWALEHE", branch: "Kakonko", phone: "255654656981" },
  { name: "AISHA M MTWEE", branch: "Kakonko", phone: "255648497977" },
  { name: "ELIA F NGALEMBULA", branch: "Kakonko", phone: "255754356993" },
  { name: "JACLINE P NDILASELA", branch: "NEW KALENGE", phone: "255796007151" },
] as const;

/**
 * Disbursed loans — page 1 of 4, ten of thirty-four rows.
 *
 * Source: Loan Disbursed (/admin/disburse_loan).
 *
 * Rows 1 and 10 genuinely have a blank Customer Name in the legacy system.
 * Reproduced rather than filled in.
 *
 * `principalPlusInterest` is exactly `disbursed x (1 + rate)` on all ten rows,
 * so the legacy interest basis is confirmed as simple interest on the original
 * principal.
 *
 * `restoration` is transcribed verbatim and is NOT derivable from the other
 * columns — it runs consistently above principalPlusInterest / repayments, by
 * 1,250 on the small weekly loans but 20,000 on the two large ones. Whatever
 * the add-on is comes from a screen not yet captured, so nothing computes it.
 */
export const LEGACY_DISBURSED_LOANS = [
  { row: 1, customerName: "", branch: "NEW KALENGE", loanAc: "21065796958137", disbursed: 600_000, interestRate: 20, principalPlusInterest: 720_000, restorationType: "Weekly", repayments: 5, restoration: 164_000, date: "2026-06-22" },
  { row: 2, customerName: "tumaini c katakuzi", branch: "NEW KALENGE", loanAc: "13258174470965", disbursed: 100_000, interestRate: 30, principalPlusInterest: 130_000, restorationType: "Weekly", repayments: 2, restoration: 67_500, date: "2026-05-16" },
  { row: 3, customerName: "CHRIZESTOM B KATAKUZI", branch: "NEW KALENGE", loanAc: "93662917750144", disbursed: 50_000, interestRate: 30, principalPlusInterest: 65_000, restorationType: "Weekly", repayments: 1, restoration: 70_000, date: "2026-05-16" },
  { row: 4, customerName: "ELISHA M ADAMU", branch: "NEW KALENGE", loanAc: "65278293348050", disbursed: 20_000, interestRate: 30, principalPlusInterest: 26_000, restorationType: "Weekly", repayments: 4, restoration: 7_750, date: "2026-04-08" },
  { row: 5, customerName: "ASHA Z JUMA", branch: "NEW KALENGE", loanAc: "50764086733495", disbursed: 20_000, interestRate: 30, principalPlusInterest: 26_000, restorationType: "Weekly", repayments: 4, restoration: 7_750, date: "2026-04-08" },
  { row: 6, customerName: "HASSAN J SAIDI", branch: "NEW KALENGE", loanAc: "17436245039817", disbursed: 20_000, interestRate: 30, principalPlusInterest: 26_000, restorationType: "Weekly", repayments: 4, restoration: 7_750, date: "2026-04-08" },
  { row: 7, customerName: "ZUENA E HASAN", branch: "NEW KALENGE", loanAc: "62185794780031", disbursed: 40_000, interestRate: 30, principalPlusInterest: 52_000, restorationType: "Weekly", repayments: 4, restoration: 14_250, date: "2026-04-07" },
  { row: 8, customerName: "ALY J JACKSPON", branch: "NEW KALENGE", loanAc: "24627150937498", disbursed: 20_000, interestRate: 30, principalPlusInterest: 26_000, restorationType: "Weekly", repayments: 4, restoration: 7_750, date: "2026-04-07" },
  { row: 9, customerName: "CATHERINI D NTABA", branch: "NEW KALENGE", loanAc: "37763241605529", disbursed: 30_000, interestRate: 30, principalPlusInterest: 39_000, restorationType: "Weekly", repayments: 4, restoration: 11_000, date: "2026-04-07" },
  { row: 10, customerName: "", branch: "NEW KALENGE", loanAc: "15794266725818", disbursed: 700_000, interestRate: 20, principalPlusInterest: 840_000, restorationType: "Weekly", repayments: 5, restoration: 188_000, date: "2026-04-07" },
] as const;

/**
 * What the Loan Disbursed footer prints across all thirty-four rows.
 *
 * The ten captured rows account for 1,600,000 of the 14,540,888. The remaining
 * twenty-four are uncaptured, which is why the screen shows both figures rather
 * than pretending the page total is the book total.
 */
export const LEGACY_DISBURSED_TOTALS = {
  disbursed: 14_540_888,
  principalPlusInterest: 21_006_147,
  rowCount: 34,
} as const;

/**
 * Loans awaiting approval — page 1 of 3, ten of twenty-four rows.
 *
 * Source: Loan Pending Approve (/admin/loan_pending). The only capture carrying
 * customer phone numbers.
 */
export const LEGACY_PENDING_LOANS = [
  { row: 1, loanAc: "82743814036592", customerName: "maswi m gachuma", phone: "255769138896", branch: "Missenyi", amount: 1_000_000, duration: "Monthly", repayments: 6, loanStatus: "PENDING", customerStatus: "NEW" },
  { row: 2, loanAc: "56087605493931", customerName: "EDIGAR J PAUL", phone: "255712456324", branch: "NEW KALENGE", amount: 50_000, duration: "Monthly", repayments: 2, loanStatus: "PENDING", customerStatus: "NEW" },
  { row: 3, loanAc: "70834043792958", customerName: "FARYJALLAH M JOHN", phone: "255758144234", branch: "NEW KALENGE", amount: 20_000, duration: "Monthly", repayments: 3, loanStatus: "PENDING", customerStatus: "NEW" },
  { row: 4, loanAc: "26520771139534", customerName: "JASITIN J LUVANGA", phone: "255645473537", branch: "Kakonko", amount: 540_000, duration: "Monthly", repayments: 4, loanStatus: "PENDING", customerStatus: "NEW" },
  { row: 5, loanAc: "64711930294580", customerName: "EZRA J MBWILO", phone: "255702635621", branch: "Kakonko", amount: 600_000, duration: "Monthly", repayments: 5, loanStatus: "PENDING", customerStatus: "NEW" },
  { row: 6, loanAc: "39853821290456", customerName: "REBECCA P MPPOGOLE", phone: "255713121681", branch: "Kakonko", amount: 2_000_000, duration: "Monthly", repayments: 8, loanStatus: "PENDING", customerStatus: "NEW" },
  { row: 7, loanAc: "67053217596041", customerName: "REMY I SWALEHE", phone: "255654656981", branch: "Kakonko", amount: 1_230_000, duration: "Monthly", repayments: 7, loanStatus: "PENDING", customerStatus: "NEW" },
  { row: 8, loanAc: "31993425808510", customerName: "AISHA M MTWEE", phone: "255648497977", branch: "Kakonko", amount: 1_500_000, duration: "Monthly", repayments: 8, loanStatus: "PENDING", customerStatus: "NEW" },
  { row: 9, loanAc: "31948051760729", customerName: "ELIA F NGALEMBULA", phone: "255754356993", branch: "Kakonko", amount: 500_000, duration: "Monthly", repayments: 4, loanStatus: "PENDING", customerStatus: "NEW" },
  { row: 10, loanAc: "82640150985323", customerName: "JACLINE P NDILASELA", phone: "255796007151", branch: "NEW KALENGE", amount: 2_000_000, duration: "Monthly", repayments: 3, loanStatus: "PENDING", customerStatus: "NEW" },
] as const;

/** Loan Pending Approve prints "Showing 1 to 10 of 24 entries". */
export const LEGACY_PENDING_ROW_COUNT = 24;

/* -------------------------------------------------------------------------
 * Teller, Agent, Insurance and VISA
 *
 * These four modules had never been captured, and everything the rebuild had
 * for them was inferred from their menu labels. The captures arrived and
 * overturned three of the four guesses, which is worth stating plainly because
 * it is the reason `module-fixtures.ts` was deleted rather than corrected:
 *
 *   Teller    — guessed: a cash-desk position, opening float to closing
 *               balance. Actually: a customer search. "Teller Dashboard" is a
 *               landing page with one dropdown on it.
 *   Agent     — guessed: agent collections and settlements. Close, but the
 *               breadcrumb calls the module "Clientless transaction", and
 *               Payment Mode is a bare lookup with no provider or status.
 *   Insurance — guessed: an insurance premium ledger. Actually: SAVINGS. Every
 *               breadcrumb and card title on all four screens says "Saving
 *               Deposit"; only the sidebar says Insurance. See the note on
 *               LEGACY_SAVINGS_SCREENS.
 *   VISA      — guessed: issued cards, masked PANs, expiry. Actually: a bank
 *               account list — "Bank Account & password" — where VISA is one
 *               column among several.
 * ---------------------------------------------------------------------- */

/**
 * The Insurance/Savings contradiction, recorded rather than resolved.
 *
 * The sidebar entry reads "Insurelance" and its four children are all named for
 * insurance. Every screen behind them is titled for savings. Both are the
 * legacy system's own words, so this is not a spelling to correct — it is two
 * halves of the old system disagreeing about what a module is, and only the
 * owner can say which is right.
 *
 * The rebuild keeps the sidebar's label on the navigation, because that is what
 * an operator clicks, and the screens' own titles on the screens, because that
 * is what an operator reads once there.
 */
export const LEGACY_SAVINGS_SCREENS = {
  "/insurance/movements": { breadcrumb: ["Saving Deposit", "Search customer"], title: "Search Customer" },
  "/insurance/today": { breadcrumb: ["saving deposit"], title: "Today saving Deposit" },
  "/insurance/today-withdrawals": { breadcrumb: ["Saving Deposit", "Saving withdrawal"], title: "All Saving withdrawal" },
  "/insurance/balance": { breadcrumb: ["saving deposit", "saving balance"], title: "Saving Deposit balance" },
} as const;

/**
 * The Saving withdrawal filter strip, verbatim: All | Saving Taken | Saving
 * clear loan.
 *
 * A tab strip enumerates its own vocabulary, so unlike most of what these
 * screens show, this list is complete. "Saving clear loan" is the interesting
 * one: it says a customer's savings can be applied against their loan, which is
 * a rule no other captured screen reveals.
 */
export const LEGACY_SAVING_WITHDRAWAL_KINDS = ["All", "Saving Taken", "Saving clear loan"] as const;

/**
 * Customers as the Teller Dashboard's search lists them: full legal name, then
 * the customer number.
 *
 * Two things this settles that nothing else had:
 *
 *   1. The names on the loan lists are abbreviated. "maswi m gachuma" there is
 *      "maswi mlimi gachuma" here — first name, middle INITIAL, last name. The
 *      loan screens were never showing a different person, and the full names
 *      below are the ones a migration should carry.
 *   2. The customer number format: C + the registration date + a two-digit
 *      sequence. C2026072978 is the 78th record, registered 2026-07-29.
 *      Confirmed across all five: two share 2026-07-29 with sequence 78 and 79.
 */
export const LEGACY_TELLER_CUSTOMERS = [
  { name: "SAMWEL LAZARO TONYONGO", customerNumber: "C2026072979" },
  { name: "maswi mlimi gachuma", customerNumber: "C2026072978" },
  { name: "JONAS MATARE JUMA", customerNumber: "C2026062928" },
  { name: "CHRIZESTOM BENEDICTO KATAKUZI", customerNumber: "C2026052823" },
  { name: "tumaini chrizestom katakuzi", customerNumber: "C2026052822" },
] as const;

/**
 * The banks named on the Bank Account & password screen.
 *
 * The three Tanzanian banks that actually appear, plus NMB31 exactly as it is
 * printed on row 1 — which is either an account label or a typo for NMB, and
 * transcribing it as "NMB" would destroy the only evidence either way.
 */
export const LEGACY_BANK_NAMES = ["NMB", "CRDB", "NBC", "NMB31"] as const;

/**
 * Bank accounts — page 1 of 5, ten of forty-four rows.
 *
 * Source: Bank Account & password (/admin/bank_password), the screen the
 * sidebar reaches through VISA.
 *
 * Every phone number here matches one on Loan Pending Approve, which is what
 * confirms the abbreviated-name reading above. Two rows carry no account name
 * at all, and the VISA column is empty on all ten — so what that column holds
 * is still unknown, even though the screen is now captured.
 */
export const LEGACY_BANK_ACCOUNTS = [
  { row: 1, branch: "MISSENYI", customerName: "maswi mlimi gachuma", phone: "255769138896", accountName: "NMB31", visa: null },
  { row: 2, branch: "TEST", customerName: "JONAS MATARE JUMA", phone: "255793075599", accountName: "CRDB", visa: null },
  { row: 3, branch: "NEW KALENGE", customerName: "EDIGAR JASON PAUL", phone: "255712456324", accountName: null, visa: null },
  { row: 4, branch: "NEW KALENGE", customerName: "FARYJALLAH MANGURA JOHN", phone: "255758144234", accountName: null, visa: null },
  { row: 5, branch: "KAKONKO", customerName: "JASITIN JOSHUA LUVANGA", phone: "255645473537", accountName: "CRDB", visa: null },
  { row: 6, branch: "KAKONKO", customerName: "EZRA JOSEPH MBWILO", phone: "255702635621", accountName: "NMB", visa: null },
  { row: 7, branch: "KAKONKO", customerName: "REBECCA PETERO MPPOGOLE", phone: "255713121681", accountName: "NBC", visa: null },
  { row: 8, branch: "KAKONKO", customerName: "REMY IDI SWALEHE", phone: "255654656981", accountName: "NBC", visa: null },
  { row: 9, branch: "KAKONKO", customerName: "AISHA MESEN MTWEE", phone: "255648497977", accountName: "CRDB", visa: null },
  { row: 10, branch: "KAKONKO", customerName: "ELIA FABIAN NGALEMBULA", phone: "255754356993", accountName: "NMB", visa: null },
] as const;

/** Bank Account & password prints "Showing 1 to 10 of 44 entries". */
export const LEGACY_BANK_ACCOUNT_ROW_COUNT = 44;

/* -------------------------------------------------------------------------
 * The Customer Profile screen
 *
 * Captured at /admin/customer_profile/2979 (SAMWEL L TONYONGO, C2026072979) —
 * the first capture of any profile, and it settles several things that had been
 * guessed:
 *
 *   Year        — the readonly box beside Date of Birth is AGE. 23/07/2004 with
 *                 "22" in it. The registration form's identical box was read
 *                 the same way on a guess; this confirms it.
 *   Loan Type   — the vocabulary is Swahili and business-segment based
 *                 ("Wajasiliamali", roughly "entrepreneurs"), NOT the
 *                 product-shaped list of Individual/Group/Salary/Business that
 *                 InferredLookups had guessed.
 *   Customer    — "Types of customer" holds BINAFSI (individual), not the
 *                 New/Existing/VIP guessed from the loan lists' NEW badge.
 *                 Those are two different fields entirely.
 *   Balance     — is not a tab. It is a modal over whatever tab is open, with
 *                 three fixed rows and a print button.
 * ---------------------------------------------------------------------- */

/**
 * Values read off the profile screen. Every one is a real stored value.
 *
 * These lists are what a capture actually showed, so they are a floor and not a
 * ceiling: a select showing "Wajasiliamali" proves that value exists, not that
 * it is the only one. The rest of each dropdown is still uncaptured.
 */
export const LEGACY_PROFILE_VALUES = {
  /** Seen in the Loan Type select. */
  loanTypes: ["Wajasiliamali"],
  /** Seen in the "Types of customer" select. */
  customerTypes: ["BINAFSI"],
  /** Seen in the Employee select — the first real staff name in any capture. */
  employees: ["MTANI MTANI MTANI"],
  /** Seen in the Additional Details "Account Type" select. */
  accountTypes: ["LOAN ACCOUNT"],
  /** The profile's Position / Busines Type field. */
  businessTypes: ["MJASILIAMALI"],
  /** Marital Status — the legacy label misspells it "Martial Status". */
  maritalStatuses: ["Single"],
} as const;

/**
 * The profile's tab strip, verbatim and in order.
 *
 * Nine entries, the last of which is a way out rather than a tab. Spellings are
 * the old system's; the labels this app draws correct them, as it does
 * everywhere — "Aditional", "Gualantors" and "Martial" are all misspelled in
 * the original markup.
 */
export const LEGACY_PROFILE_TABS = [
  "Basic",
  "Aditional Details",
  "Passport & Bank Details",
  "Guarantors",
  "All Loans",
  "Mark",
  "Balance",
  "KYC status",
  "Back",
] as const;

/** The three rows the Customer Balance modal always prints, in order. */
export const LEGACY_BALANCE_ROWS = [
  "Remain Loan Amount",
  "Salary Advance",
  "Penalty Amount",
] as const;

/**
 * District, Ward and Street are FREE-TEXT INPUTS on the legacy registration
 * form — only Region is a select.
 *
 * Recorded because it contradicts the written brief, which asked for district
 * and ward dropdowns. There is no legacy district or ward lookup table to copy:
 * the legacy system never had one. Our four-level geography hierarchy is an
 * addition of ours, not a reproduction.
 */
export const LEGACY_ADDRESS_INPUTS = {
  region: "select",
  district: "text",
  ward: "text",
  street: "text",
} as const;
