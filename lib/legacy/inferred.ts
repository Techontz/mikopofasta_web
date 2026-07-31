/**
 * INFERRED placeholder values — NOT transcribed from the legacy system.
 *
 * The frontend counterpart of the API repo's `InferredLookups.php`, and kept in
 * its own file for the same reason: so that what was read off a legacy screen
 * (`lib/legacy/source.ts`) and what was filled in to make a screen usable can
 * never be confused for one another.
 *
 * Every value here is chosen to be recognisable as a placeholder. That is the
 * whole design constraint — a fixture that looks like real data is worse than
 * no fixture, because nobody thinks to question it.
 */
export const InferredPlaceholders = {
  /**
   * Shown where a customer has no phone number on any captured screen.
   *
   * Ten of the eighteen carry a real number from Loan Pending Approve. The
   * other eight get this rather than an invented number: a dash reads as
   * "unknown", where 0700-000-004 reads as a fact and is one someone might
   * eventually dial.
   */
  NO_PHONE_CAPTURED: "—",

  /**
   * A fixed timestamp, so a server render and its hydration agree.
   *
   * `new Date()` here would produce a different value on the server than in the
   * browser and trip a hydration mismatch — the same reason every other fixture
   * in this codebase uses fixed date strings.
   */
  PLACEHOLDER_TIMESTAMP: "2026-01-01T00:00:00.000Z",

  /**
   * A customer number for a design row.
   *
   * Prefixed rather than formatted like a real one, so it is obvious in a
   * screenshot and greppable in a bug report.
   */
  customerNumber(index: number): string {
    return `DESIGN-${String(index).padStart(4, "0")}`;
  },
} as const;

/**
 * The dropdown contents the legacy screens never show open.
 *
 * Every one of these is listed in `UNOBSERVED` in `lib/legacy/source.ts` — the
 * registration form was captured with all six selects closed, and the Loan
 * Withdrawal table that would have revealed Method was captured empty. They are
 * filled in anyway, because an empty select makes the form it sits on
 * unassessable as a design, and a reviewer cannot judge a control they cannot
 * open.
 *
 * They live here rather than in source.ts precisely because they are not
 * evidence. Anything in this file is a guess with a real chance of being wrong;
 * anything in source.ts was read off a screen.
 */
export const InferredLookups = {
  /** No employee name appears anywhere in the captures. */
  employees: ["John Mushi", "Grace Kimaro", "Amina Hassan", "Peter Mwangi"],

  /** Near-certain, but the legacy label text and casing are still unconfirmed. */
  genders: ["Male", "Female"],

  loanTypes: ["Individual Loan", "Group Loan", "Salary Advance", "Business Loan"],

  /** The registration form's "Types of customer", which is not the same field
      as the loan lists' Customer Status (NEW / EXISTING). */
  customerTypes: ["New", "Existing", "VIP"],

  /** Tanzania has thirty-one regions; which subset the legacy select lists is
      unknown, so this is the eight the owner named. */
  regions: [
    "Dar es Salaam",
    "Kagera",
    "Kigoma",
    "Arusha",
    "Mwanza",
    "Dodoma",
    "Mbeya",
    "Tanga",
  ],

  /** Seen on the loan lists as a column value, never as an open select. */
  customerStatuses: ["NEW", "EXISTING"],
} as const;
