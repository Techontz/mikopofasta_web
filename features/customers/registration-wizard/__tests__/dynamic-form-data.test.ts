import assert from "node:assert/strict";
import { test } from "node:test";
import {
  WizardSchema,
  defaultWizardValues,
  repairDraft,
  toRecord,
} from "@/features/customers/registration-wizard/wizard-schema";
import { structuredNameFor } from "@/features/customers/registration-wizard/structured-fields";
import type { DynamicFormField } from "@/types/customer";

/**
 * `dynamicFormData` is a RECORD, at every point it exists.
 *
 * These cover the bug that reached a browser: an empty record sent to the API
 * comes back as `[]`, because PHP has one array type and JSON has two
 * containers. Resuming such a draft put an array where the schema demands a
 * record and refused the save — and only ever in the EMPTY case, which is why
 * it survived every test that had data in it.
 *
 * Run with `npm run test:wizard`. Deliberately node:test rather than a new test
 * framework: `tsx` was already a dependency and this needs no DOM.
 */

/** A step-1-and-2 form that the schema should accept. */
function completedForm(overrides: Record<string, unknown> = {}) {
  return {
    ...defaultWizardValues("3", "7"),
    firstName: "Conrad",
    middleName: "M",
    lastName: "Buberwa",
    dob: "1998-02-12",
    gender: "male",
    phone: "0754000000",
    idTypeId: "1",
    idNumber: "19980212898765678987",
    regionId: "1",
    districtId: "2",
    wardName: "Kakonko Mjini",
    streetName: "Market Street",
    customerCategoryId: "8",
    ...overrides,
  };
}

test("1. a fresh registration starts with an empty record, not an array", () => {
  const fresh = defaultWizardValues("3", "7");

  assert.equal(Array.isArray(fresh.dynamicFormData), false);
  assert.deepEqual(fresh.dynamicFormData, {});
  assert.equal(Object.prototype.toString.call(fresh.dynamicFormData), "[object Object]");
});

test("2. writing one configured answer keeps the record shape", () => {
  const next = { ...toRecord(defaultWizardValues("3", "7").dynamicFormData), land_size: 4 };

  assert.equal(Array.isArray(next), false);
  assert.deepEqual(next, { land_size: 4 });
});

test("3. several answers become keys, never list entries", () => {
  let held = toRecord({});
  for (const [key, value] of [["land_size", 4], ["has_title_deed", true], ["crop", "maize"]] as const) {
    held = { ...held, [key]: value };
  }

  assert.deepEqual(held, { land_size: 4, has_title_deed: true, crop: "maize" });
  assert.deepEqual(Object.keys(held), ["land_size", "has_title_deed", "crop"]);
});

test("4. a draft holding the array the API used to return is repaired", () => {
  /* The exact value that reached the browser. */
  const repaired = repairDraft({ dynamicFormData: [] as never });

  assert.deepEqual(repaired.dynamicFormData, {});
  assert.equal(Array.isArray(repaired.dynamicFormData), false);
});

test("4b. a populated list is rescued when its entries name their own key", () => {
  assert.deepEqual(
    toRecord([{ key: "crop", value: "maize" }, { key: "bad" }, "junk"]),
    { crop: "maize" },
  );
});

test("4c. values the schema cannot hold are dropped rather than carried", () => {
  assert.deepEqual(toRecord({ ok: "yes", nested: { a: 1 }, broken: Number.NaN, gone: null }), {
    ok: "yes",
  });
});

test("5. a valid record passes the wizard schema", () => {
  const result = WizardSchema.safeParse(completedForm({ dynamicFormData: { crop: "maize" } }));

  assert.equal(result.success, true, JSON.stringify(result.error?.issues));
});

test("5b. the array is refused rather than quietly accepted", () => {
  /* The schema must stay strict — the fix belongs upstream of it. */
  const result = WizardSchema.safeParse(completedForm({ dynamicFormData: [] }));

  assert.equal(result.success, false);
  assert.ok(result.error?.issues.some((i) => i.path[0] === "dynamicFormData"));
});

test("6. the browser scenario: a configured customer type, every field answered", () => {
  /* The private-sector shape from the screenshot: every configured field writes
     to a real column, so the JSON record stays empty — which is precisely the
     case that used to fail. Nothing here names a customer type. */
  const configured: DynamicFormField[] = [
    { key: "nickname", label: "Nickname", type: "text", required: false, storesIn: "nickname" },
    { key: "employer_id", label: "Employer / Company", type: "select", required: true, storesIn: "employerId" },
    { key: "occupation", label: "Job / Occupation", type: "text", required: true, storesIn: "occupation" },
    { key: "basic_salary", label: "Basic Salary", type: "currency", required: true, storesIn: "basicSalary" },
    { key: "take_home", label: "Take Home", type: "currency", required: true, storesIn: "takeHome" },
  ];

  const answers: Record<string, unknown> = {};
  let json = toRecord({});

  for (const field of configured) {
    const name = structuredNameFor(field);
    const value = field.type === "currency" ? 900000 : "answer";

    if (name === null) json = { ...json, [field.key]: value as string };
    else answers[name] = value;
  }

  /* Every answer went to a column; the record is legitimately empty. */
  assert.deepEqual(json, {});

  const result = WizardSchema.safeParse(completedForm({ ...answers, dynamicFormData: json }));
  assert.equal(result.success, true, JSON.stringify(result.error?.issues));
});

test("7. the answers survive into the values the payload is built from", () => {
  const form = completedForm({
    basicSalary: 1200000,
    takeHome: 900000,
    occupation: "Driver",
    dynamicFormData: { crop: "maize" },
  });

  const parsed = WizardSchema.safeParse(form);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data?.basicSalary, 1200000);
  assert.equal(parsed.data?.occupation, "Driver");
  assert.deepEqual(parsed.data?.dynamicFormData, { crop: "maize" });
});
