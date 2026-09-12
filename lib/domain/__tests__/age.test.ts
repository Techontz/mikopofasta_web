import assert from "node:assert/strict";
import { test } from "node:test";
import { ageInYears, formatAge } from "@/lib/domain/age";

/**
 * Age gates what a customer may be sold, so the arithmetic is pinned against a
 * fixed "today" rather than the clock: a test that passes in September and
 * fails in October is worse than no test.
 */
const TODAY = new Date(2026, 8, 12); // 12 September 2026, local

test("counts whole years elapsed", () => {
  assert.equal(ageInYears("1998-05-13", TODAY), 28);
});

test("does not count a birthday that has not happened yet this year", () => {
  assert.equal(ageInYears("1998-12-25", TODAY), 27);
});

test("counts the birthday on the day itself", () => {
  assert.equal(ageInYears("1998-09-12", TODAY), 28);
});

test("does not count the day before the birthday", () => {
  assert.equal(ageInYears("1998-09-13", TODAY), 27);
});

test("reads a calendar date, not an instant", () => {
  /*
   * `new Date("1998-05-13")` is midnight UTC. Read back with the local
   * getters west of Greenwich it is the 12th, which moved a birthday by a day
   * and cost anyone born on the 13th a year on their birthday. The three
   * numbers come from the string now, so the answer does not depend on where
   * the officer is sitting.
   */
  assert.equal(ageInYears("1998-05-13", new Date(1998 + 28, 4, 13)), 28);
});

test("a leap-day birth has an age on a non-leap year", () => {
  assert.equal(ageInYears("2000-02-29", new Date(2026, 1, 28)), 25);
  assert.equal(ageInYears("2000-02-29", new Date(2026, 2, 1)), 26);
});

test("an infant is zero, not nothing", () => {
  assert.equal(ageInYears("2026-09-01", TODAY), 0);
});

test("nothing recorded is not an age", () => {
  assert.equal(ageInYears(null, TODAY), null);
  assert.equal(ageInYears(undefined, TODAY), null);
  assert.equal(ageInYears("", TODAY), null);
  assert.equal(ageInYears("   ", TODAY), null);
});

test("a date that is not a date is not an age", () => {
  assert.equal(ageInYears("not-a-date", TODAY), null);
  assert.equal(ageInYears("13/05/1998", TODAY), null);
});

test("a day that does not exist is refused rather than slid forward", () => {
  // Date(2001, 1, 30) rolls to 2 March; that must not read back as a birthday.
  assert.equal(ageInYears("2001-02-30", TODAY), null);
  assert.equal(ageInYears("1998-13-01", TODAY), null);
});

test("a date of birth in the future is not a negative age", () => {
  assert.equal(ageInYears("2030-01-01", TODAY), null);
});

test("accepts a full timestamp, reading only the calendar part", () => {
  assert.equal(ageInYears("1998-05-13T21:00:00.000Z", TODAY), 28);
});

test("reads as an officer would say it", () => {
  assert.equal(formatAge(28), "28 years");
  assert.equal(formatAge(1), "1 year");
  assert.equal(formatAge(0), "Under 1 year");
  assert.equal(formatAge(null), null);
});
