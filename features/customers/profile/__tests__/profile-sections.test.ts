import assert from "node:assert/strict";
import { test } from "node:test";
import { anyPresent, isPresent } from "@/features/customers/profile/field-presence";
import {
  buildProfileSections,
  sectionHasAnswers,
  type Lookups,
  type SectionSpec,
} from "@/features/customers/profile/profile-section-specs";
import { MASTER_DATA_LISTS } from "@/types/master-data";
import type { CustomerCategory } from "@/types/customer";

/**
 * WHAT A CUSTOMER PROFILE SHOWS.
 *
 * The screen these cover used to render every column the customer resource
 * carries and print an em dash for each null, so a customer with a name, a
 * phone and an address showed those three answers among roughly sixty dashes.
 * What replaced it has exactly two rules, and both of them can hide something:
 * that is the risk worth testing.
 *
 *   - A value that IS there must always be shown, whatever the customer's type
 *     says is relevant. Hiding a recorded answer is the one unacceptable
 *     outcome, and `0`, `false` and an unclassified customer are where a
 *     careless check would do it.
 *
 *   - A value that is NOT there must not be rendered, and a block where
 *     nothing is recorded must not exist at all.
 *
 * Run with `npm run test:profile`. Deliberately node:test over the pure spec
 * builder rather than a DOM test of the component: the rules are all here, and
 * the component's job — mapping a spec to a card — is not where the bug was.
 */

/** Every declared list, empty. Names come from master data; none is needed here. */
const lookups = Object.fromEntries(
  MASTER_DATA_LISTS.map((list) => [list, []])
) as unknown as Lookups;

/** A Customer Type, with the four blocks it asks for spelled out. */
function categoryOf(overrides: Partial<CustomerCategory> = {}): CustomerCategory {
  return {
    id: "1",
    name: "Watumishi",
    code: "WATUMISHI",
    description: null,
    riskTier: "low",
    sector: "employment",
    requiredDocuments: [],
    dynamicFormSchema: [],
    requiresSector: true,
    requiresEmployer: false,
    requiresContract: true,
    requiresSalary: true,
    requiresExtraApproval: false,
    createdBy: null,
    deletedAt: null,
    ...overrides,
  } as CustomerCategory;
}

function sectionsFor(
  values: Record<string, string | number | null>,
  category: CustomerCategory | undefined
): SectionSpec[] {
  return buildProfileSections({ values, category, lookups, branches: [], employees: [] });
}

const byKey = (sections: SectionSpec[], key: string) => {
  const found = sections.find((s) => s.key === key);
  assert.ok(found, `no section named ${key}`);
  return found;
};

/** What the closed section renders: the fields that hold an answer. */
const shown = (section: SectionSpec, values: Record<string, unknown>) =>
  section.fields.filter((f) => isPresent(values[f.name])).map((f) => f.name);

/** What the open section asks for: everything relevant, plus everything answered. */
const offered = (section: SectionSpec, values: Record<string, unknown>) =>
  section.fields
    .filter((f) => isPresent(values[f.name]) || (f.relevant ?? true))
    .map((f) => f.name);

/* The record behind the screenshots that started this: a name, a phone, a
   ward, a street and a residence type. Everything else is null. */
const minimal = {
  firstName: "Innocent",
  middleName: "bjdbj",
  lastName: "Rugashoborola",
  gender: "male",
  dob: "1998-05-13",
  phone: "0622466807",
  branchId: "4",
  employeeId: "9",
  wardName: "iujiopklok",
  streetName: "14951 Bellows Falls Ln #1027",
  residenceType: "owned",
  nickname: null,
  email: null,
  alternativePhone: null,
  nationality: null,
  nationalIdNumber: null,
  voterIdNumber: null,
  driverLicenceNumber: null,
  passportNumber: null,
  tinNumber: null,
  workIdNumber: null,
  idTypeId: null,
  idNumber: null,
  bankId: null,
  bankBranch: null,
  accountName: null,
  accountNumber: null,
  checkNumber: null,
  mobileMoneyProviderId: null,
  walletNumber: null,
  cardLastFour: null,
  cardExpiryMonth: null,
  cardExpiryYear: null,
  employer: null,
  department: null,
  businessName: null,
  businessType: null,
  businessAddress: null,
} satisfies Record<string, string | number | null>;

// ---------------------------------------------------------------- presence --

test("a recorded zero is an answer, not an empty field", () => {
  /* The whole reason this is not a truthiness check. A take-home of 0 and a
     dependants count of 0 are what the officer wrote down. */
  assert.equal(isPresent(0), true);
  assert.equal(isPresent(false), true);
  assert.equal(isPresent(""), false);
  assert.equal(isPresent("   "), false);
  assert.equal(isPresent(null), false);
  assert.equal(isPresent(undefined), false);
  assert.equal(isPresent(Number.NaN), false);
});

test("a section exists when any one of its fields does", () => {
  assert.equal(anyPresent({ a: null, b: 0 }, ["a", "b"]), true);
  assert.equal(anyPresent({ a: null, b: "  " }, ["a", "b"]), false);
  assert.equal(anyPresent({}, []), false);
});

// ------------------------------------------------------- the empty customer --

test("a customer with minimal data shows only the blocks that hold something", () => {
  const sections = sectionsFor(minimal, categoryOf());
  const withAnswers = sections.filter((s) => sectionHasAnswers(s, minimal)).map((s) => s.key);

  assert.deepEqual(withAnswers, ["basic", "address"]);
});

test("nothing on a minimal customer renders an em dash", () => {
  const sections = sectionsFor(minimal, categoryOf());

  for (const section of sections) {
    for (const name of shown(section, minimal)) {
      assert.ok(isPresent(minimal[name as keyof typeof minimal]), `${name} rendered without a value`);
    }
  }

  /* The six identity numbers and the ten money fields of the screenshots. */
  assert.deepEqual(shown(byKey(sections, "identity"), minimal), []);
  assert.deepEqual(shown(byKey(sections, "money"), minimal), []);
  assert.deepEqual(shown(byKey(sections, "employment"), minimal), []);
  assert.deepEqual(shown(byKey(sections, "business"), minimal), []);
});

// ------------------------------------------------------------ customer type --

test("a salaried customer is offered employment and never business", () => {
  const category = categoryOf({ sector: "employment" });
  const sections = sectionsFor(minimal, category);

  assert.equal(byKey(sections, "employment").relevant, true);
  assert.equal(byKey(sections, "business").relevant, false);
});

test("a trader is offered business and never employment", () => {
  const category = categoryOf({ sector: "business" });
  const sections = sectionsFor(minimal, category);

  assert.equal(byKey(sections, "business").relevant, true);
  assert.equal(byKey(sections, "employment").relevant, false);
});

test("a type that asks for no salary does not ask for a take-home", () => {
  const asks = byKey(sectionsFor(minimal, categoryOf({ requiresSalary: true })), "employment");
  const does_not = byKey(sectionsFor(minimal, categoryOf({ requiresSalary: false })), "employment");

  assert.ok(offered(asks, minimal).includes("takeHome"));
  assert.ok(!offered(does_not, minimal).includes("takeHome"));
});

test("a type that asks for no contract does not ask for its expiry", () => {
  const section = byKey(sectionsFor(minimal, categoryOf({ requiresContract: false })), "employment");
  const names = offered(section, minimal);

  assert.ok(!names.includes("contractTypeId"));
  assert.ok(!names.includes("contractExpiryDate"));
});

test("an unclassified customer has nothing narrowed away", () => {
  /* Registered before Customer Types existed, or under one since removed.
     Nothing is known about what applies, so every block stays on offer rather
     than the officer losing the only place to record what they are holding. */
  const sections = sectionsFor(minimal, undefined);

  assert.equal(byKey(sections, "employment").relevant, true);
  assert.equal(byKey(sections, "business").relevant, true);
  assert.ok(offered(byKey(sections, "employment"), minimal).includes("basicSalary"));
});

// ------------------------------------------------- relevance never hides data --

test("business data on a salaried customer is still shown", () => {
  /* The record is the authority on what it holds. A trader reclassified as a
     public servant must not have their business name vanish. */
  const values = { ...minimal, businessName: "Mama Ntilie Kiosk" };
  const section = byKey(sectionsFor(values, categoryOf({ sector: "employment" })), "business");

  assert.ok(sectionHasAnswers(section, values));
  assert.deepEqual(shown(section, values), ["businessName"]);
  /* And it stays editable, so it can be corrected or cleared. */
  assert.ok(offered(section, values).includes("businessName"));
});

test("a salary recorded under a type that no longer asks for one is still shown", () => {
  const values = { ...minimal, takeHome: 0, basicSalary: 450000 };
  const section = byKey(sectionsFor(values, categoryOf({ requiresSalary: false })), "employment");

  assert.deepEqual(shown(section, values), ["basicSalary", "takeHome"]);
});

test("a superseded column is shown when it holds a value and never offered when it does not", () => {
  const empty = byKey(sectionsFor(minimal, categoryOf()), "money");
  assert.ok(!offered(empty, minimal).includes("bankName"));

  const values = { ...minimal, bankName: "CRDB" };
  const filled = byKey(sectionsFor(values, categoryOf()), "money");
  assert.ok(shown(filled, values).includes("bankName"));
  assert.ok(offered(filled, values).includes("bankName"));
});

// --------------------------------------------------------------- money block --

test("bank details appear on their own, without the rest of the block", () => {
  const values = { ...minimal, bankId: "3", accountNumber: "0150123456700" };
  const section = byKey(sectionsFor(values, categoryOf()), "money");

  assert.deepEqual(shown(section, values), ["bankId", "accountNumber"]);
});

test("a card expiry is not asked for when there is no card on file", () => {
  const without = byKey(sectionsFor(minimal, categoryOf()), "money");
  assert.ok(!offered(without, minimal).includes("cardExpiryMonth"));

  const values = { ...minimal, cardLastFour: "4242" };
  const withCard = byKey(sectionsFor(values, categoryOf()), "money");
  assert.ok(offered(withCard, values).includes("cardExpiryMonth"));
});

test("a card's last four is read-only wherever it appears", () => {
  const values = { ...minimal, cardLastFour: "4242" };
  const card = byKey(sectionsFor(values, categoryOf()), "money").fields.find(
    (f) => f.name === "cardLastFour"
  );

  /* There is no column for a PAN, so the last four are derived at registration
     and this form has nothing it could legitimately write back. */
  assert.equal(card?.readOnly, true);
});

// ------------------------------------------------------------------ identity --

test("only the identity documents the customer produced are shown", () => {
  const values = { ...minimal, tinNumber: "123-456-789", idTypeId: "2", idNumber: "19980513-00001-00001-01" };
  const section = byKey(sectionsFor(values, categoryOf()), "identity");

  assert.deepEqual(shown(section, values), ["idTypeId", "idNumber", "tinNumber"]);
});

test("a document the customer has not produced yet can still be recorded", () => {
  /* The point of the edit form: a customer who finally brings their TIN needs
     somewhere to put it, even though the closed section does not show it. */
  const section = byKey(sectionsFor(minimal, categoryOf()), "identity");
  assert.ok(offered(section, minimal).includes("tinNumber"));
  assert.ok(offered(section, minimal).includes("passportNumber"));
});

// ------------------------------------------------------------- no duplicates --

test("no field is asked for twice on one profile", () => {
  /* Two sections writing the same key would let an officer save one value from
     one card and a different one from another. */
  const seen = new Map<string, string>();

  for (const section of sectionsFor(minimal, undefined)) {
    for (const field of section.fields) {
      const previous = seen.get(field.name);
      assert.equal(previous, undefined, `${field.name} is in both ${previous} and ${section.key}`);
      seen.set(field.name, section.key);
    }
  }
});
