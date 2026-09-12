import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SAVE_STEP_INDEX,
  FACE_STEP_INDEX,
  WIZARD_STEPS,
  defaultWizardValues,
  repairDraft,
  stepOwning,
  validateStepAgainstProfile,
  type WizardValues,
} from "@/features/customers/registration-wizard/wizard-schema";
import {
  registrationFieldsFor,
  renderableFields,
} from "@/features/customers/registration-wizard/customer-type-fields";
import { structuredNameFor } from "@/features/customers/registration-wizard/structured-fields";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";
import type { CustomerCategory, DynamicFormField } from "@/types/customer";

/**
 * The three-step flow: what each step asks, and what each step refuses.
 *
 * Every test here pins a rule to the STEP THAT DRAWS THE CONTROL IT IS ABOUT.
 * That is the failure this wizard keeps having — a requirement enforced on a
 * screen with no box for it, so Next refuses and nothing is highlighted — and
 * moving the customer type and next of kin to step one moved two more rules
 * that could have been left behind.
 *
 * Run with `npm run test:wizard`.
 */

const profile = (over: Partial<AccountTypeRequirementProfile> = {}) =>
  ({
    requiresMaritalStatus: false,
    requiresIdentityDocument: false,
    requiresAddress: false,
    requiresCustomerCategory: false,
    requiresEmploymentDetails: false,
    requiresBusinessDetails: false,
    requiresBankAccount: false,
    minGuarantors: 0,
    minNextOfKin: 0,
    ...over,
  }) as AccountTypeRequirementProfile;

const values = (over: Partial<WizardValues> = {}): WizardValues => ({
  ...defaultWizardValues(null, null),
  ...over,
});

const kin = { name: "Anna", relationship: "spouse", phone: "0754000000", address: null };

/** A customer type, with nothing configured unless a test configures it. */
const category = (over: Partial<CustomerCategory> = {}): CustomerCategory =>
  ({
    id: "1",
    name: "Test type",
    code: "TEST",
    riskTier: "low",
    sector: "other",
    requiredDocuments: [],
    dynamicFormSchema: [],
    requiresSector: false,
    requiresEmployer: false,
    requiresContract: false,
    requiresSalary: false,
    requiresExtraApproval: false,
    createdBy: null,
    deletedAt: null,
    ...over,
  }) as CustomerCategory;

/** The storage targets a composed list writes to, for asserting coverage. */
const targetsOf = (fields: DynamicFormField[]) =>
  fields.map((f) => structuredNameFor(f)).filter((t): t is NonNullable<typeof t> => t !== null);

/* -------------------------------------------------------------- the shape */

test("the wizard is four steps, and the customer is created on the third", () => {
  assert.deepEqual(
    WIZARD_STEPS.map((s) => s.id),
    ["basic", "details", "documents", "face"],
  );
  assert.deepEqual(WIZARD_STEPS.map((s) => s.label), [
    "Basic Information",
    "Customer Details",
    "KYC Attachments",
    "Face Verification",
  ]);

  /* The save is the third step, not the last. Face Verification runs against a
     customer who must already exist, so it can only be reached by completing
     the save — which is what this ordering encodes. */
  assert.equal(SAVE_STEP_INDEX, 2);
  assert.equal(FACE_STEP_INDEX, 3);
  assert.ok(FACE_STEP_INDEX > SAVE_STEP_INDEX, "face verification must follow the save");
});

/* ------------------------------------------------- customer type, step one */

test("the customer type is required on the step that asks it", () => {
  const errors = validateStepAgainstProfile(
    "basic",
    values({ customerCategoryId: "" }),
    profile({ requiresCustomerCategory: true }),
  );

  assert.match(errors.customerCategoryId ?? "", /customer type is required/i);
});

test("step two no longer blocks on the customer type it no longer asks", () => {
  const errors = validateStepAgainstProfile(
    "details",
    values({ customerCategoryId: "" }),
    profile({ requiresCustomerCategory: true }),
  );

  assert.equal(errors.customerCategoryId, undefined);
});

test("a message about the customer type routes to step one", () => {
  assert.equal(stepOwning("customerCategoryId"), "basic");
});

/* -------------------------------------------------- next of kin, step one */

test("next of kin is demanded on the step that collects it", () => {
  const errors = validateStepAgainstProfile("basic", values(), profile({ minNextOfKin: 1 }));

  assert.match(errors.nextOfKin ?? "", /At least 1 next of kin is required/);
});

test("a next of kin on file satisfies it, and step two stays silent", () => {
  assert.equal(
    validateStepAgainstProfile("basic", values({ nextOfKin: [kin] }), profile({ minNextOfKin: 1 }))
      .nextOfKin,
    undefined,
  );
  assert.equal(
    validateStepAgainstProfile("details", values(), profile({ minNextOfKin: 1 })).nextOfKin,
    undefined,
  );
});

test("next of kin and the address cascade both route to step one", () => {
  assert.equal(stepOwning("nextOfKin"), "basic");
  assert.equal(stepOwning("nextOfKin.0.phone"), "basic");
  assert.equal(stepOwning("wardId"), "basic");
  assert.equal(stepOwning("dependentsCount"), "basic");
});

/* ------------------------------------------------ MNO / bank, step two */

test("nothing about payment is demanded until the officer chooses a kind", () => {
  const errors = validateStepAgainstProfile("details", values(), profile());

  assert.deepEqual(errors, {});
});

test("choosing MNO asks for the provider and the wallet, and nothing about a bank", () => {
  const errors = validateStepAgainstProfile("details", values({ paymentMethod: "mno" }), profile());

  assert.ok(errors.mobileMoneyProviderId);
  assert.ok(errors.walletNumber);
  assert.equal(errors.bankId, undefined);
  assert.equal(errors.accountNumber, undefined);
});

test("choosing Bank asks for the bank and the account, and nothing about a wallet", () => {
  const errors = validateStepAgainstProfile("details", values({ paymentMethod: "bank" }), profile());

  assert.ok(errors.bankId);
  assert.ok(errors.accountName);
  assert.ok(errors.accountNumber);
  assert.equal(errors.walletNumber, undefined);
  assert.equal(errors.mobileMoneyProviderId, undefined);
});

test("a complete wallet passes", () => {
  const errors = validateStepAgainstProfile(
    "details",
    values({ paymentMethod: "mno", mobileMoneyProviderId: "2", walletNumber: "0754000000" }),
    profile({ requiresBankAccount: true }),
  );

  assert.deepEqual(errors, {});
});

test("a complete bank account passes", () => {
  const errors = validateStepAgainstProfile(
    "details",
    values({
      paymentMethod: "bank",
      bankId: "4",
      accountName: "Conrad Buberwa",
      accountNumber: "0123456789",
    }),
    profile({ requiresBankAccount: true }),
  );

  assert.deepEqual(errors, {});
});

test("an account type that requires an account refuses an unanswered chooser", () => {
  const errors = validateStepAgainstProfile(
    "details",
    values({ paymentMethod: "none" }),
    profile({ requiresBankAccount: true }),
  );

  assert.match(errors.paymentMethod ?? "", /bank account or a mobile money wallet/i);
});

test("the payment controls belong to step two", () => {
  assert.equal(stepOwning("paymentMethod"), "details");
  assert.equal(stepOwning("bankDetails.accountNumber"), "details");
  assert.equal(stepOwning("walletNumber"), "details");
});

/* ------------------------------------- what the customer type brings with it */

test("an employed customer is asked about their employment", () => {
  const targets = targetsOf(registrationFieldsFor(category({ sector: "employment" }), profile()));

  for (const expected of ["placeOfEmployment", "basicSalary", "takeHome", "monthlyIncome"]) {
    assert.ok(targets.includes(expected as never), `${expected} missing`);
  }
  assert.equal(targets.includes("businessName" as never), false);
});

/* The duplicates, gone and staying gone. Each of these was a standard box
   asking in English what every customer type now asks in its own words —
   "Department" over "Idara", "Occupation" over "Cheo" — and the officer could
   not tell which one the institution reads. They are still columns, still
   editable from the profile; what was removed is the second question. */
test("the standard block no longer repeats what the customer type asks", () => {
  const targets = targetsOf(registrationFieldsFor(category({ sector: "employment" }), profile()));

  for (const gone of ["employmentType", "workType", "employer", "occupation", "department", "councilNumber"]) {
    assert.equal(targets.includes(gone as never), false, `${gone} is asked twice again`);
  }
});

test("a trader is asked about their business", () => {
  const targets = targetsOf(registrationFieldsFor(category({ sector: "business" }), profile()));

  for (const expected of ["businessName", "businessType", "businessAddress", "monthlyIncome"]) {
    assert.ok(targets.includes(expected as never), `${expected} missing`);
  }
  assert.equal(targets.includes("basicSalary" as never), false);
});

test("a public servant's sector and cadre appear only when the type asks for them", () => {
  const without = targetsOf(registrationFieldsFor(category({ sector: "employment" }), profile()));
  assert.equal(without.includes("sectorId" as never), false);

  const with_ = registrationFieldsFor(
    category({ sector: "employment", requiresSector: true }),
    profile(),
  );
  const cadre = with_.find((f) => f.storesIn === "sectorCategoryId");

  assert.ok(cadre, "the cadre field is missing");
  /* It is fetched for the sector above it and cleared when that changes — the
     renderer does both off these two properties. */
  assert.equal(cadre?.dataSource, "sector-categories");
  assert.equal(cadre?.dependsOn, "sector_id");
});

test("a contract expiry is mandatory only for a temporary contract", () => {
  const fields = registrationFieldsFor(
    category({ sector: "employment", requiresContract: true }),
    profile(),
  );
  const expiry = fields.find((f) => f.storesIn === "contractExpiryDate");

  assert.equal(expiry?.required, false);
  assert.deepEqual(expiry?.requiredWhen, { field: "contract_type_id", equals: ["TEMPORARY"] });
});

test("the account type can pull in a block the customer type's sector does not suggest", () => {
  const targets = targetsOf(
    registrationFieldsFor(category({ sector: "other" }), profile({ requiresBusinessDetails: true })),
  );

  assert.ok(targets.includes("businessName" as never));
});

test("the administrator's own field wins over the standard one for the same column", () => {
  const configured: DynamicFormField = {
    key: "mshahara",
    label: "Mshahara wa Msingi",
    type: "currency",
    required: true,
    storesIn: "basicSalary",
  };

  const fields = registrationFieldsFor(
    category({ sector: "employment", dynamicFormSchema: [configured] }),
    profile(),
  );
  const writers = fields.filter((f) => f.storesIn === "basicSalary");

  assert.equal(writers.length, 1);
  assert.equal(writers[0].label, "Mshahara wa Msingi");
  assert.equal(writers[0].required, true);
});

test("a type that configures nothing still gets something to answer", () => {
  const fields = registrationFieldsFor(category({ sector: "other" }), profile());

  assert.ok(fields.length > 0);
  /* "Occupation" left with the other duplicates — a student's course and a
     trader's line of business are what those types actually ask. */
  assert.deepEqual(targetsOf(fields), ["monthlyIncome"]);
});

test("no customer type at all asks nothing, rather than guessing", () => {
  assert.deepEqual(registrationFieldsFor(undefined, profile()), []);
});

/* ---------------------------------------- what step two declines to draw */

test("a question step one already asks is validated but not drawn twice", () => {
  const configured: DynamicFormField = {
    key: "wategemezi",
    label: "Number of dependents",
    type: "number",
    required: true,
    storesIn: "dependentsCount",
  };

  const all = registrationFieldsFor(category({ dynamicFormSchema: [configured] }), profile());
  const drawn = renderableFields(all);

  /* Still required, so the rule survives... */
  assert.ok(all.some((f) => f.storesIn === "dependentsCount"));
  /* ...and still reported on the step that has the box. */
  assert.equal(stepOwning("dependentsCount"), "basic");
  /* But step two does not put a second control behind the same column. */
  assert.equal(drawn.some((f) => f.storesIn === "dependentsCount"), false);
});

/* Step one no longer draws a Nickname box, so a type that configures one must
   get it back on step two — otherwise a required nickname is unanswerable. */
test("a nickname question is drawn again now that step one has no box for it", () => {
  const configured: DynamicFormField = {
    key: "jina_la_utani",
    label: "Nickname",
    type: "text",
    required: true,
    storesIn: "nickname",
  };

  const drawn = renderableFields(
    registrationFieldsFor(category({ dynamicFormSchema: [configured] }), profile())
  );

  assert.ok(drawn.some((f) => f.storesIn === "nickname"));
});

test("the payment chooser owns its columns, so no configured field draws them again", () => {
  const configured: DynamicFormField[] = [
    { key: "benki", label: "Benki", type: "select", required: false, storesIn: "bankId" },
    { key: "wallet", label: "Namba ya M-Pesa", type: "text", required: false, storesIn: "walletNumber" },
  ];

  const drawn = renderableFields(
    registrationFieldsFor(category({ dynamicFormSchema: configured }), profile()),
  );

  assert.equal(drawn.some((f) => f.storesIn === "bankId"), false);
  assert.equal(drawn.some((f) => f.storesIn === "walletNumber"), false);
});

/* ------------------------------------------------------------ old drafts */

test("a draft saved before the chooser existed comes back showing what it holds", () => {
  assert.equal(repairDraft({ walletNumber: "0754000000" } as never).paymentMethod, "mno");
  assert.equal(repairDraft({ accountNumber: "0123456789" } as never).paymentMethod, "bank");
  assert.equal(repairDraft({} as never).paymentMethod, "none");
});

test("a draft that already names a method keeps it", () => {
  assert.equal(repairDraft({ paymentMethod: "bank" } as never).paymentMethod, "bank");
});
