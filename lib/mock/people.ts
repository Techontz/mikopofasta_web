import { ageFrom, daysAgo, makeRandom } from "@/lib/mock/random";
import { FEMALE_FIRST_NAMES, MALE_FIRST_NAMES, MIDDLE_INITIALS, SURNAMES } from "@/lib/mock/names";
import {
  BANKS,
  BRANCHES,
  CUSTOMER_STATUSES,
  CUSTOMER_TYPES,
  districtsFor,
  EDUCATION_LEVELS,
  HOUSE_OWNERSHIP,
  KIN_RELATIONSHIPS,
  LOAN_TYPES,
  MARITAL_STATUSES,
  OCCUPATIONS,
  REGIONS,
  streetsFor,
  wardsFor,
} from "@/lib/mock/reference";

/**
 * The people in the demo: fifty employees and one hundred and twenty customers.
 *
 * Generated once at module load from a fixed seed, so the same customer always
 * has the same branch, phone number and loan history no matter which screen you
 * arrive from. That consistency is the whole point — a demo where the customer
 * list and the customer profile disagree about somebody's branch is worse than
 * no demo, because it is the first thing a reviewer notices and the last thing
 * they trust afterwards.
 *
 * Relationships that hold by construction:
 *   - every employee belongs to one of the twelve branches;
 *   - every customer belongs to a branch and is registered by an employee AT
 *     THAT BRANCH, never one from somewhere else;
 *   - a customer's region, district, ward and street form a real chain;
 *   - gender follows from the given name.
 */

export type Employee = {
  id: string;
  staffNumber: string;
  name: string;
  branch: string;
  role: string;
  phone: string;
};

export type Guarantor = {
  name: string;
  relationship: string;
  phone: string;
  occupation: string;
};

export type Customer = {
  id: string;
  customerId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  gender: "Male" | "Female";
  dob: string;
  age: number;
  phone: string;
  branch: string;
  employee: string;
  loanType: string;
  customerType: string;
  status: (typeof CUSTOMER_STATUSES)[number];
  registeredOn: string;

  region: string;
  district: string;
  ward: string;
  street: string;

  nationalId: string;
  passportNumber: string;
  occupation: string;
  employer: string;
  maritalStatus: string;
  educationLevel: string;
  email: string;
  monthlyIncome: number;
  houseOwnership: string;

  nextOfKin: string;
  kinRelationship: string;
  kinPhone: string;

  bankName: string;
  accountName: string;
  accountNumber: string;
  tinNumber: string;
  nidaNumber: string;

  creditScore: number;
  guarantors: Guarantor[];
};

const OFFICER_ROLES = [
  "Loan Officer",
  "Senior Loan Officer",
  "Field Officer",
  "Credit Officer",
  "Branch Manager",
] as const;

/**
 * A phone number in Tanzanian format.
 *
 * Built from the index rather than randomly, so every number in the demo is
 * distinct — duplicates in a customer list look like a data-quality bug and
 * invite a conversation about deduplication that has nothing to do with the
 * design under review.
 */
function phoneFor(index: number, prefix = "07"): string {
  return `${prefix}${String(60_000_000 + index * 137_911).slice(0, 8)}`;
}

function fullNameOf(first: string, middle: string, last: string) {
  return `${first} ${middle} ${last}`;
}

/* ------------------------------------------------------------------ employees */

export const EMPLOYEES: Employee[] = (() => {
  const rng = makeRandom(1_001);

  return Array.from({ length: 50 }, (_, i) => {
    const isMale = rng.chance(0.55);
    const first = rng.pick(isMale ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES);
    const last = rng.pick(SURNAMES);
    const middle = rng.pick(MIDDLE_INITIALS);

    return {
      id: `emp-${i + 1}`,
      staffNumber: `MF-${String(i + 1).padStart(4, "0")}`,
      name: fullNameOf(first, middle, last),
      // Head Office is excluded: loan officers sit at the branches they lend to.
      branch: BRANCHES[1 + (i % (BRANCHES.length - 1))],
      role: i % 11 === 0 ? "Branch Manager" : rng.pick(OFFICER_ROLES.slice(0, 4)),
      phone: phoneFor(i, "075"),
    };
  });
})();

/** The officers at one branch — what the Employee dropdown narrows to. */
export function employeesAt(branch: string): Employee[] {
  return EMPLOYEES.filter((e) => e.branch === branch);
}

/* ------------------------------------------------------------------ customers */

export const CUSTOMERS: Customer[] = (() => {
  const rng = makeRandom(2_002);

  return Array.from({ length: 120 }, (_, i) => {
    const isMale = rng.chance(0.52);
    const first = rng.pick(isMale ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES);
    const last = rng.pick(SURNAMES);
    const middle = rng.pick(MIDDLE_INITIALS);
    const fullName = fullNameOf(first, middle, last);

    const branch = BRANCHES[1 + (i % (BRANCHES.length - 1))];

    // The registering officer always belongs to the customer's own branch.
    const branchOfficers = EMPLOYEES.filter((e) => e.branch === branch);
    const officer = branchOfficers[i % Math.max(1, branchOfficers.length)];

    const region = rng.pick(REGIONS);
    const districts = districtsFor(region);
    const district = districts.length ? rng.pick(districts) : region;
    const wards = wardsFor(district);
    const ward = rng.pick(wards);
    const street = rng.pick(streetsFor(ward));

    const dob = daysAgo(rng.int(19, 62) * 365 + rng.int(0, 364));
    const occupation = rng.pick(OCCUPATIONS);

    /*
     * Most customers are Active. The spread across the other three is
     * deliberate rather than uniform: a list where a quarter of the book is
     * Closed does not look like a working lender, and the status filter needs
     * every option to return something.
     */
    const status = rng.chance(0.68)
      ? "Active"
      : rng.chance(0.55)
        ? "Pending"
        : rng.chance(0.6)
          ? "Suspended"
          : "Closed";

    const kinIsMale = rng.chance(0.5);

    return {
      id: `cus-${i + 1}`,
      customerId: `MF${String(10_001 + i)}`,
      firstName: first,
      middleName: middle,
      lastName: last,
      fullName,
      gender: isMale ? "Male" : "Female",
      dob,
      age: ageFrom(dob),
      phone: phoneFor(i),
      branch,
      employee: officer?.name ?? EMPLOYEES[0].name,
      loanType: rng.pick(LOAN_TYPES),
      customerType: rng.pick(CUSTOMER_TYPES),
      status: status as Customer["status"],
      registeredOn: daysAgo(rng.int(30, 900)),

      region,
      district,
      ward,
      street,

      nationalId: `${rng.int(19_600_000, 20_050_000)}-${rng.int(10_000, 99_999)}-${rng.int(10_000, 99_999)}-${rng.int(10, 99)}`,
      passportNumber: rng.chance(0.25) ? `TZ${rng.int(1_000_000, 9_999_999)}` : "—",
      occupation,
      employer: rng.chance(0.4) ? "Self Employed" : rng.pick(["Government", "Private Company", "Self Employed", "NGO"]),
      maritalStatus: rng.pick(MARITAL_STATUSES),
      educationLevel: rng.pick(EDUCATION_LEVELS),
      email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, "")}@example.co.tz`,
      monthlyIncome: rng.money(150_000, 3_500_000, 50_000),
      houseOwnership: rng.pick(HOUSE_OWNERSHIP),

      nextOfKin: fullNameOf(
        rng.pick(kinIsMale ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES),
        rng.pick(MIDDLE_INITIALS),
        last // next of kin usually shares the family name
      ),
      kinRelationship: rng.pick(KIN_RELATIONSHIPS),
      kinPhone: phoneFor(i + 500, "076"),

      bankName: rng.pick(BANKS),
      accountName: fullName,
      accountNumber: String(rng.int(1_000_000_0000, 9_999_999_9999)),
      tinNumber: `${rng.int(100, 999)}-${rng.int(100, 999)}-${rng.int(100, 999)}`,
      nidaNumber: `${rng.int(19_600_000, 20_050_000)}${rng.int(100_000, 999_999)}${rng.int(1_000, 9_999)}`,

      creditScore: rng.int(420, 810),
      guarantors: [],
    };
  });
})();

/**
 * Guarantors, attached in a second pass.
 *
 * They have to be other real customers — the spec is explicit that guarantors
 * come from the existing book — and that cannot be done while the book is still
 * being built. Each customer gets two, neither of them themselves.
 */
(() => {
  const rng = makeRandom(3_003);

  for (const customer of CUSTOMERS) {
    const others = CUSTOMERS.filter((c) => c.id !== customer.id);
    customer.guarantors = rng.sample(others, 2).map((g) => ({
      name: g.fullName,
      relationship: rng.pick(KIN_RELATIONSHIPS),
      phone: g.phone,
      occupation: g.occupation,
    }));
  }
})();

export const CUSTOMER_BY_ID = new Map(CUSTOMERS.map((c) => [c.id, c]));

/** Customers at one branch — what a branch-scoped dropdown narrows to. */
export function customersAt(branch: string): Customer[] {
  return CUSTOMERS.filter((c) => c.branch === branch);
}

/**
 * Initials for the avatar placeholder.
 *
 * The demo has no photographs, and generating faces for a hundred and twenty
 * fictional borrowers would be a strange thing to do. Initials on a tinted
 * circle is what most systems fall back to anyway when a photo is missing.
 */
export function initialsOf(fullName: string): string {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
