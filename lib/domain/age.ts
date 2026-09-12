/**
 * Age in whole years, from a date of birth.
 *
 * DERIVED, NEVER STORED. Age is the one fact about a person that is wrong again
 * every year, so there is no `age` column and no `age` field on any payload —
 * the date of birth is the record and this reads it. A stored age and a stored
 * date of birth that disagree is the kind of thing nobody notices until a
 * customer is refused a product they qualify for.
 *
 * ONE COPY. This calculation lived twice, byte-identical, in
 * `features/customers/view-models.ts` and in the by-type customer page, and the
 * registration form now needs it as well. Three copies of an arithmetic that
 * decides what a customer is eligible for is three chances for two screens to
 * print different ages for the same person.
 *
 * PARSED AS CALENDAR PARTS, NOT AS AN INSTANT. `new Date("1998-05-13")` is
 * midnight UTC, and `getFullYear()`/`getMonth()`/`getDate()` are local — so for
 * an operator west of Greenwich that date reads back as the 12th, and anyone
 * whose birthday is today gets an age one year short. A date of birth is a
 * calendar date, not a moment, so the three numbers are taken from the string
 * and compared against today's three numbers. (Tanzania is UTC+3, where the old
 * form happened to agree; this makes it agree everywhere.)
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

export function ageInYears(dob: string | null | undefined, today: Date = new Date()): number | null {
  if (!dob) return null;

  const match = ISO_DATE.exec(dob.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  /* A real calendar date. `2001-02-30` parses as three numbers but is not a
     day, and round-tripping it through Date would silently slide it to March. */
  const probe = new Date(year, month - 1, day);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    return null;
  }

  let age = today.getFullYear() - year;
  const beforeBirthdayThisYear =
    today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthdayThisYear) age -= 1;

  /* A date of birth in the future is not an age. The registration form rejects
     one before this is ever read; a record that somehow holds one shows nothing
     rather than "-3 years". */
  return age < 0 ? null : age;
}

/**
 * The age as the officer reads it, or null when there is nothing to say.
 *
 * An infant is "Under 1 year" rather than "0 years", which reads like a missing
 * value rather than a newborn.
 */
export function formatAge(age: number | null): string | null {
  if (age === null) return null;
  if (age === 0) return "Under 1 year";
  return `${age} ${age === 1 ? "year" : "years"} old`;
}
