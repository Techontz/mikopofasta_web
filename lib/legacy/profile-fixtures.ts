import {
  LEGACY_BANK_ACCOUNTS,
  LEGACY_CUSTOMERS,
  LEGACY_DISBURSED_LOANS,
  LEGACY_PENDING_LOANS,
  LEGACY_PROFILE_VALUES,
  LEGACY_TELLER_CUSTOMERS,
} from "@/lib/legacy/source";
import { InferredLookups } from "@/lib/legacy/inferred";

/**
 * A full customer profile per customer, for the design phase.
 *
 * Two kinds of value live in here and the difference matters:
 *
 *   TRANSCRIBED — name, branch, phone, customer number, and any loan the
 *   captured screens actually show against this person. Cross-referenced by
 *   phone number against Loan Pending Approve and Bank Account & password.
 *
 *   INVENTED — everything the legacy profile screen has and no capture shows:
 *   occupation, income, education, next of kin, guarantors, KYC state, marks.
 *   The profile screen itself has never been captured, so the *fields* come
 *   from the owner's brief and the *values* are ours.
 *
 * Every value is derived from the customer's index rather than randomised, so
 * a given customer looks the same on every render — a profile that reshuffles
 * between a server render and its hydration is a bug, and one that reshuffles
 * between page loads makes the design impossible to review.
 */

/* ------------------------------------------------------------------ helpers */

/** Deterministic pick. No randomness anywhere in this file, by design. */
function pick<T>(list: readonly T[], index: number): T {
  return list[index % list.length];
}

/** A small spread of values that still looks varied across eighteen people. */
function spread(index: number, min: number, max: number, step = 1): number {
  const range = Math.floor((max - min) / step) + 1;
  return min + ((index * 7) % range) * step;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/* ------------------------------------------------------- invented vocabulary */

const OCCUPATIONS = [
  "Shopkeeper",
  "Tailor",
  "Farmer",
  "Fishmonger",
  "Boda rider",
  "Carpenter",
  "Hairdresser",
  "Food vendor",
  "Mechanic",
];

const EMPLOYERS = [
  "Self-employed",
  "Kariakoo Market stall",
  "Self-employed",
  "Mwanza Fish Traders",
  "Self-employed",
  "Nyumbani Furniture",
  "Self-employed",
  "Self-employed",
  "Uhuru Auto Garage",
];

const MARITAL_STATUSES = ["Single", "Married", "Widowed", "Separated"];
const EDUCATION = ["Primary", "Secondary", "Certificate", "Diploma", "Degree"];
const HOUSE_OWNERSHIP = ["Owned", "Rented", "Family owned"];
const RELATIONSHIPS = ["Spouse", "Sibling", "Parent", "Child", "Cousin"];
const BUSINESS_LOCATIONS = [
  "Kariakoo Market, Stall 42",
  "Mwanza Road, Block C",
  "Bus Stand Lane, Shop 7",
  "Central Market, Row 3",
  "Uhuru Street, Shop 19",
];
const BANKS = ["NMB", "CRDB", "NBC"];
const DISTRICT_SUFFIX = ["Urban", "Rural", "Municipal"];
const WARDS = ["Mchikichini", "Kalenge", "Bugene", "Nyakato", "Mabatini", "Kibaha"];
const STREETS = ["Uhuru", "Nyerere", "Sokoni", "Shule", "Bomani", "Mwenge"];

/** The officers the registration form's Employee select is seeded with. */
const OFFICERS = InferredLookups.employees;

export type KycState = "verified" | "pending" | "rejected";
export type GuarantorState = "verified" | "pending" | "rejected";

export interface ProfileLoan {
  account: string;
  type: string;
  principal: number;
  interestRate: number;
  totalPayable: number;
  outstanding: number;
  installments: number;
  /* Columns the captured All Loans table carries. */
  durationType: string;
  withdrawalDate: string;
  endDate: string;
  status: "Disbursed" | "Pending" | "Closed";
  /** True when this row came off a captured legacy screen rather than from here. */
  transcribed: boolean;
}

export interface ProfileGuarantor {
  name: string;
  /* The captured Guarantors table splits the name across three columns. */
  firstName: string;
  middleName: string;
  lastName: string;
  initials: string;
  phone: string;
  relationship: string;
  region: string;
  district: string;
  ward: string;
  street: string;
  status: GuarantorState;
}

export interface ProfileMark {
  label: string;
  detail: string;
  score: number;
}

export interface CustomerProfile {
  /** The customer number, which is also this profile's URL segment. */
  id: string;
  fullName: string;
  /** The abbreviated form the loan lists print. */
  shortName: string;
  initials: string;

  branch: string;
  phone: string;
  gender: string;
  dob: string;
  age: number;
  customerType: string;
  loanType: string;
  loanOfficer: string;
  status: "Active" | "Suspended";
  kycStatus: KycState;

  region: string;
  district: string;
  ward: string;
  street: string;
  businessLocation: string;

  firstName: string;
  middleName: string;
  lastName: string;

  /** The header's Create Date, and the Additional Details fields the capture shows. */
  createDate: string;
  nickName: string;
  accountType: string;
  businessType: string;
  numberOfDependents: string;

  nationalId: string;
  passportNumber: string;
  occupation: string;
  employer: string;
  maritalStatus: string;
  education: string;
  email: string;
  monthlyIncome: number;
  houseOwnership: string;
  nextOfKin: string;
  nextOfKinRelationship: string;
  nextOfKinPhone: string;

  bankName: string;
  accountName: string;
  accountNumber: string;
  tinNumber: string;
  nidaNumber: string;

  guarantors: ProfileGuarantor[];
  loans: ProfileLoan[];
  marks: ProfileMark[];
  kyc: { label: string; state: KycState }[];
  attachments: { name: string; kind: string; state: KycState }[];

  balance: {
    outstanding: number;
    totalPaid: number;
    totalInterest: number;
    totalPenalties: number;
    current: number;
  };
}

/* -------------------------------------------------- transcribed cross-refs */

/**
 * The loan lists' abbreviation rule, applied to a full name.
 *
 * "CHRIZESTOM BENEDICTO KATAKUZI" → "CHRIZESTOM B KATAKUZI". First name, middle
 * initial, last name — the pattern the Bank Account and Teller captures proved
 * when their full names lined up with the loan lists' short ones by phone
 * number. Casing is left alone: these are people's names as the system records
 * them, not strings to normalise.
 */
function abbreviate(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 3) return fullName;
  const middles = parts.slice(1, -1).map((m) => `${m[0]}`);
  return [parts[0], ...middles, parts[parts.length - 1]].join(" ");
}

/**
 * Full legal names, by phone number.
 *
 * The loan lists abbreviate; Bank Account & password and the Teller search
 * carry the full form. Where a customer appears on one of those, the full name
 * is used — it is what the legacy record actually holds.
 */
const FULL_NAME_BY_PHONE = new Map<string, string>(
  LEGACY_BANK_ACCOUNTS.map((a) => [a.phone, a.customerName])
);

/**
 * Full legal names again, this time by the abbreviated form.
 *
 * Eight of the eighteen carry no phone number on any capture, so the map above
 * cannot reach them — and two of those eight are named in full by the Teller
 * search. Matching on the abbreviation is what connects them, and without it
 * CHRIZESTOM and tumaini kept synthetic ids while their real customer numbers
 * sat unused two files away.
 */
const FULL_NAME_BY_SHORT = new Map<string, string>([
  ...LEGACY_BANK_ACCOUNTS.map((a) => [abbreviate(a.customerName), a.customerName] as const),
  ...LEGACY_TELLER_CUSTOMERS.map((c) => [abbreviate(c.name), c.name] as const),
]);

/** Customer numbers, for the five the Teller search reveals. */
const NUMBER_BY_FULL_NAME = new Map<string, string>(
  LEGACY_TELLER_CUSTOMERS.map((c) => [c.name, c.customerNumber])
);

/** The bank a customer actually banks with, where a capture shows it. */
const BANK_BY_PHONE = new Map<string, string>(
  LEGACY_BANK_ACCOUNTS.filter((a) => a.accountName).map((a) => [a.phone, a.accountName as string])
);

/**
 * A customer number for someone the Teller search never showed.
 *
 * Follows the format that search revealed — C + registration date + a two-digit
 * sequence — so every id on these screens is at least shaped like a real one.
 * The date is derived from the index, not from today, so it never drifts.
 */
function syntheticNumber(index: number): string {
  const month = String((index % 7) + 1).padStart(2, "0");
  const day = String((index % 27) + 1).padStart(2, "0");
  return `C2026${month}${day}${String(index + 10).padStart(2, "0")}`;
}

/**
 * The end date of a loan, from its start, cadence and instalment count.
 *
 * Derived rather than stored, so it can never disagree with the three columns
 * beside it — the same reason the teller's closing balance is derived.
 */
function endDateFrom(start: string, cadence: string, installments: number): string {
  const date = new Date(`${start}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "—";

  const days = cadence === "Daily" ? 1 : cadence === "Weekly" ? 7 : 30;
  date.setUTCDate(date.getUTCDate() + days * installments);
  return date.toISOString().slice(0, 10);
}

/** Loans a capture actually shows against this person. */
function transcribedLoans(shortName: string): ProfileLoan[] {
  const disbursed = LEGACY_DISBURSED_LOANS.filter((l) => l.customerName === shortName).map(
    (l): ProfileLoan => ({
      account: l.loanAc,
      type: "Individual Loan",
      principal: l.disbursed,
      interestRate: l.interestRate,
      totalPayable: l.principalPlusInterest,
      // The captures show no repayment history, so nothing has been paid off.
      outstanding: l.principalPlusInterest,
      installments: l.repayments,
      durationType: l.restorationType,
      withdrawalDate: l.date,
      endDate: endDateFrom(l.date, l.restorationType, l.repayments),
      status: "Disbursed",
      transcribed: true,
    })
  );

  const pending = LEGACY_PENDING_LOANS.filter((l) => l.customerName === shortName).map(
    (l): ProfileLoan => ({
      account: l.loanAc,
      type: "Individual Loan",
      principal: l.amount,
      interestRate: 30,
      totalPayable: Math.round(l.amount * 1.3),
      outstanding: 0,
      installments: l.repayments,
      durationType: l.duration,
      /* Loan Pending Approve carries no date column at all. */
      withdrawalDate: "—",
      endDate: "—",
      status: "Pending",
      transcribed: true,
    })
  );

  return [...disbursed, ...pending];
}

/**
 * Settled loans, to give the history some depth.
 *
 * INVENTED, and marked as such on the row. Each captured customer appears on
 * exactly one legacy loan screen, so a profile built from transcription alone
 * shows a single loan and a Balance tab where every figure is the same number.
 * One or two closed loans behind it is what a real borrower's record looks
 * like, and it is what makes the tab worth designing against.
 *
 * Account numbers keep the legacy fourteen-digit shape but are derived from the
 * index, so they are stable and cannot collide with a transcribed one.
 */
function historicalLoans(index: number, loanType: string): ProfileLoan[] {
  const count = index % 3 === 0 ? 2 : 1;

  return Array.from({ length: count }, (_, n) => {
    const principal = spread(index + n * 3, 50_000, 900_000, 25_000);
    const rate = pick([20, 30], index + n);
    const totalPayable = Math.round(principal * (1 + rate / 100));

    return {
      account: String(10_000_000_000_000 + (index + 1) * 7_919 + n * 104_729).slice(0, 14),
      type: loanType,
      principal,
      interestRate: rate,
      totalPayable,
      outstanding: 0,
      installments: 4 + ((index + n) % 5),
      durationType: pick(["Weekly", "Monthly", "Daily"], index + n),
      withdrawalDate: `2025-${String(((index + n) % 12) + 1).padStart(2, "0")}-${String(((index + n) % 27) + 1).padStart(2, "0")}`,
      endDate: `2026-${String(((index + n) % 12) + 1).padStart(2, "0")}-${String(((index + n) % 27) + 1).padStart(2, "0")}`,
      status: "Closed" as const,
      transcribed: false,
    };
  });
}

/** One guarantor, in the shape the captured Guarantors table lists them. */
function guarantorFrom(
  source: (typeof LEGACY_CUSTOMERS)[number],
  index: number,
  states: readonly GuarantorState[]
): ProfileGuarantor {
  const parts = source.name.trim().split(/\s+/);
  const region = pick(InferredLookups.regions, index + 3);

  return {
    name: source.name,
    firstName: parts[0] ?? "",
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
    initials: initialsOf(source.name),
    phone: source.phone ?? "—",
    relationship: pick(RELATIONSHIPS, index),
    region,
    district: `${region} ${pick(DISTRICT_SUFFIX, index)}`,
    ward: pick(WARDS, index),
    street: pick(STREETS, index),
    status: pick(states, index),
  };
}

/* ------------------------------------------------------------ the profiles */

function buildProfile(
  customer: (typeof LEGACY_CUSTOMERS)[number],
  index: number
): CustomerProfile {
  const phone = customer.phone ?? `2557${String(10_000_000 + index * 111_111).slice(0, 8)}`;
  const fullName =
    FULL_NAME_BY_PHONE.get(customer.phone ?? "") ??
    FULL_NAME_BY_SHORT.get(customer.name) ??
    customer.name;
  const id = NUMBER_BY_FULL_NAME.get(fullName) ?? syntheticNumber(index);

  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
  const middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";

  const age = 22 + ((index * 3) % 26);
  const region = pick(InferredLookups.regions, index);
  const gender = index % 2 === 0 ? "Male" : "Female";
  const monthlyIncome = spread(index, 180_000, 1_400_000, 20_000);

  /*
   * The captured value first, then the inferred list behind it. The profile
   * capture proved "Wajasiliamali" is real and that the guessed
   * Individual/Group/Salary/Business list was the wrong shape entirely, so the
   * real value is what most customers carry here.
   */
  const loanType = pick(
    [...LEGACY_PROFILE_VALUES.loanTypes, ...InferredLookups.loanTypes],
    index
  );
  const loans = [...transcribedLoans(customer.name), ...historicalLoans(index, loanType)];
  const outstanding = loans.reduce((sum, l) => sum + l.outstanding, 0);
  const totalInterest = loans.reduce((sum, l) => sum + (l.totalPayable - l.principal), 0);
  const totalPaid = loans.reduce((sum, l) => sum + (l.totalPayable - l.outstanding), 0);
  const totalPenalties = loans.length > 0 ? spread(index, 0, 45_000, 5_000) : 0;

  /*
   * KYC is derived from what the captures actually contain rather than picked:
   * a customer with a phone number on a legacy screen has a verified phone, and
   * one with a bank account on file has a verified address. The rest is
   * invented, and the profile says so on screen.
   */
  /*
   * A captured phone number is a verified one. The other eight get a spread
   * rather than a flat "pending" — every profile shows a phone number, so
   * defaulting the whole book to unverified made every overall badge amber and
   * left the design with one green state in eighteen customers to look at.
   */
  const phoneVerified: KycState = customer.phone
    ? "verified"
    : pick<KycState>(["verified", "pending", "verified"], index);
  const addressVerified: KycState = BANK_BY_PHONE.has(customer.phone ?? "")
    ? "verified"
    : pick<KycState>(["verified", "verified", "pending", "verified"], index);
  const nidaVerified = pick<KycState>(["verified", "verified", "verified", "pending"], index);
  /*
   * Weighted, not uniform, and deliberately tilted towards verified.
   *
   * The header badge is the strict AND of these four — it has to be, or a
   * profile could read "KYC Verified" above a tab showing a pending check. With
   * four evenly-cycled checks almost nobody came out fully verified, so the
   * green state was effectively absent from a screen built to display it. The
   * tilt is here, on the inputs, rather than on the summary.
   */
  const passportVerified = pick<KycState>(
    ["verified", "verified", "verified", "pending", "verified", "rejected"],
    index + 1
  );

  const kyc = [
    { label: "NIDA Verification", state: nidaVerified },
    { label: "Phone Verification", state: phoneVerified },
    { label: "Address Verification", state: addressVerified },
    { label: "Passport Verification", state: passportVerified },
  ];

  const overallKyc: KycState = kyc.every((k) => k.state === "verified")
    ? "verified"
    : kyc.some((k) => k.state === "rejected")
      ? "rejected"
      : "pending";

  /* Two guarantors, named from other customers on the book — which is what a
     village-banking group actually looks like. */
  const g1 = LEGACY_CUSTOMERS[(index + 5) % LEGACY_CUSTOMERS.length];
  const g2 = LEGACY_CUSTOMERS[(index + 11) % LEGACY_CUSTOMERS.length];

  return {
    id,
    fullName,
    shortName: customer.name,
    initials: initialsOf(fullName),

    branch: customer.branch,
    phone,
    gender,
    dob: `${2026 - age}-${String((index % 12) + 1).padStart(2, "0")}-${String((index % 27) + 1).padStart(2, "0")}`,
    age,
    customerType: pick(
      [...LEGACY_PROFILE_VALUES.customerTypes, ...InferredLookups.customerTypes],
      index
    ),
    loanType,
    loanOfficer: pick([...LEGACY_PROFILE_VALUES.employees, ...OFFICERS], index),
    status: index % 9 === 4 ? "Suspended" : "Active",
    kycStatus: overallKyc,

    region,
    district: `${region} ${pick(DISTRICT_SUFFIX, index)}`,
    ward: pick(WARDS, index),
    street: pick(STREETS, index),
    businessLocation: pick(BUSINESS_LOCATIONS, index),

    firstName,
    middleName,
    lastName,

    /* The profile header prints a Create Date; the capture's is blank, so this
       is derived from the customer number's own date part. */
    createDate: `${id.slice(1, 5)}-${id.slice(5, 7)}-${id.slice(7, 9)}`,
    nickName: lastName || firstName,
    accountType: LEGACY_PROFILE_VALUES.accountTypes[0],
    businessType: pick([...LEGACY_PROFILE_VALUES.businessTypes, ...OCCUPATIONS], index),
    /*
     * Number of Dependents, and the capture has a PHONE NUMBER in it —
     * 0747436817 against a customer whose phone is 255747436817. That is a data
     * fault in the legacy record, not a field we have misread, and it is one to
     * catch at migration. Ours holds a count.
     */
    numberOfDependents: String(index % 6),

    nationalId: `19${String(80 + (index % 20))}${String(1000 + index * 37).slice(0, 4)}${String(index + 11).padStart(2, "0")}`,
    passportNumber: index % 3 === 0 ? `TZ${String(400_000 + index * 137)}` : "—",
    occupation: pick(OCCUPATIONS, index),
    employer: pick(EMPLOYERS, index),
    maritalStatus: pick(MARITAL_STATUSES, index),
    education: pick(EDUCATION, index),
    email: `${firstName.toLowerCase().replace(/[^a-z]/g, "")}.${(lastName || "customer").toLowerCase().replace(/[^a-z]/g, "")}@example.co.tz`,
    monthlyIncome,
    houseOwnership: pick(HOUSE_OWNERSHIP, index),
    nextOfKin: g1.name,
    nextOfKinRelationship: pick(RELATIONSHIPS, index),
    nextOfKinPhone: g1.phone ?? `2557${String(20_000_000 + index * 131_313).slice(0, 8)}`,

    bankName: BANK_BY_PHONE.get(customer.phone ?? "") ?? pick(BANKS, index),
    accountName: fullName,
    accountNumber: String(20_110_045_781 + index * 1_237),
    tinNumber: `${String(100 + index)}-${String(200 + index)}-${String(300 + index)}`,
    nidaNumber: `${String(19_800_000_000 + index * 1_234_567)}`,

    guarantors: [
      guarantorFrom(g1, index, ["verified", "pending", "verified"]),
      guarantorFrom(g2, index + 2, ["verified", "verified", "rejected"]),
    ],

    loans,

    marks: [
      {
        label: "Repayment record",
        detail:
          loans.length === 0
            ? "No loan history on the book yet."
            : "Instalments met on the captured schedule.",
        score: spread(index, 55, 95, 5),
      },
      {
        label: "Attendance",
        detail: "Group meeting attendance over the last cycle.",
        score: spread(index + 1, 40, 100, 5),
      },
      {
        label: "Savings discipline",
        detail: "Consistency of deposits against the agreed amount.",
        score: spread(index + 2, 35, 100, 5),
      },
    ],

    kyc,

    attachments: [
      { name: "National ID", kind: "Identity", state: nidaVerified },
      { name: "Passport photo", kind: "Photo", state: passportVerified },
      { name: "Business licence", kind: "Business", state: addressVerified },
    ],

    balance: {
      outstanding,
      totalPaid,
      totalInterest,
      totalPenalties,
      current: outstanding + totalPenalties,
    },
  };
}

/** Every customer on the book, with a full profile behind each. */
export const CUSTOMER_PROFILES: CustomerProfile[] = LEGACY_CUSTOMERS.map(buildProfile);

/** Look one up by the customer number in the URL. */
export function findProfile(id: string): CustomerProfile | undefined {
  return CUSTOMER_PROFILES.find((p) => p.id === id);
}

/** The list the search dropdown offers, in the order the legacy screens name them. */
export const PROFILE_OPTIONS = CUSTOMER_PROFILES.map((p) => ({
  id: p.id,
  label: p.fullName,
  branch: p.branch,
}));

/* ------------------------------------------------------- teller session ---- */

export interface TellerStatementLine {
  date: string;
  description: string;
  deposit: number;
  withdrawal: number;
  balance: number;
  remainDebit: number;
  penalty: number;
}

export interface TellerSession {
  /** The loan the teller screen leads with: the newest one still running. */
  loan: {
    withdrawalDate: string;
    endDate: string;
    amount: number;
    insurance: number;
    restoration: number;
    amountPaid: number;
    remainingDebt: number;
  } | null;
  account: {
    opening: number;
    deposit: number;
    withdrawal: number;
    closing: number;
  };
  statement: TellerStatementLine[];
}

/**
 * What the Teller's Customer Loan Information screen shows for one customer.
 *
 * Derived from the profile rather than stored beside it, so the teller screen
 * and the profile's All Loans tab can never disagree about the same loan.
 *
 * Two things about the captured screen are worth recording:
 *
 *   - It prints the literal string "YY-MM-DD" where a loan has no date. That is
 *     the old system's empty-date placeholder, not a formatting bug, and it is
 *     reproduced for a loan that has none.
 *   - Its Opening/Deposit/Withdrawal read 0,0,0 with a Closing of 33,435,883 —
 *     which cannot be true of the same account. Ours foots: closing is opening
 *     plus deposits less withdrawals, so the four columns always agree.
 */
export function tellerSessionFor(profile: CustomerProfile): TellerSession {
  const running =
    profile.loans.find((l) => l.status === "Disbursed") ??
    profile.loans.find((l) => l.status === "Pending") ??
    null;

  const statement: TellerStatementLine[] = [];
  let balance = 0;

  for (const loan of profile.loans) {
    if (loan.withdrawalDate === "—") continue;

    balance += loan.principal;
    statement.push({
      date: loan.withdrawalDate,
      description: `Loan withdrawal · ${loan.account}`,
      deposit: 0,
      withdrawal: loan.principal,
      balance,
      remainDebit: loan.totalPayable,
      penalty: 0,
    });

    /* A closed loan was repaid in full; a running one has paid nothing yet,
       which is what the captured loan screens show. */
    if (loan.status === "Closed") {
      balance -= loan.totalPayable;
      statement.push({
        date: loan.endDate,
        description: `Loan cleared · ${loan.account}`,
        deposit: loan.totalPayable,
        withdrawal: 0,
        balance,
        remainDebit: 0,
        penalty: 0,
      });
    }
  }

  statement.sort((a, b) => b.date.localeCompare(a.date));

  const deposit = statement.reduce((sum, l) => sum + l.deposit, 0);
  const withdrawal = statement.reduce((sum, l) => sum + l.withdrawal, 0);

  return {
    loan: running
      ? {
          withdrawalDate: running.withdrawalDate,
          endDate: running.endDate,
          amount: running.principal,
          /* No captured screen shows an insurance figure against a loan. */
          insurance: 0,
          restoration: Math.round(running.totalPayable / running.installments),
          amountPaid: running.totalPayable - running.outstanding,
          remainingDebt: running.outstanding,
        }
      : null,
    account: {
      opening: 0,
      deposit,
      withdrawal,
      closing: deposit - withdrawal,
    },
    statement,
  };
}
