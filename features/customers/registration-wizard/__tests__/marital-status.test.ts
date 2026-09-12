import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultWizardValues,
  stepOwning,
  validateStepAgainstProfile,
  type WizardValues,
} from "@/features/customers/registration-wizard/wizard-schema";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";

/**
 * Marital status was VALIDATED AND NEVER DRAWN.
 *
 * The rule was checked against step two while no step in the wizard rendered
 * the field, so an account type with `requiresMaritalStatus` refused to advance
 * and highlighted nothing — the same shape as the loan product Save that did
 * nothing, and just as unreportable from the screen.
 *
 * These pin the two halves that have to agree: the rule runs on the step that
 * shows the control, and a message about the field routes to that same step.
 */
const profile = (over: Partial<AccountTypeRequirementProfile> = {}) =>
  ({
    requiresMaritalStatus: false,
    requiresIdentityDocument: false,
    requiresAddress: false,
    requiresCustomerCategory: false,
    ...over,
  }) as AccountTypeRequirementProfile;

const values = (over: Partial<WizardValues> = {}): WizardValues => ({
  ...defaultWizardValues(null, null),
  ...over,
});

test("the rule runs on the step that draws the field", () => {
  const errors = validateStepAgainstProfile(
    "basic",
    values({ maritalStatusId: "", maritalStatus: null }),
    profile({ requiresMaritalStatus: true })
  );

  assert.equal(errors.maritalStatusId, "Marital status is required for this account type.");
});

test("step two no longer blocks on a field it does not show", () => {
  const errors = validateStepAgainstProfile(
    "details",
    values({ maritalStatusId: "", maritalStatus: null }),
    profile({ requiresMaritalStatus: true })
  );

  assert.equal(errors.maritalStatusId, undefined);
});

test("an answer from the admin-managed list satisfies it", () => {
  const errors = validateStepAgainstProfile("basic", values({ maritalStatusId: "3" }), profile({ requiresMaritalStatus: true }));

  assert.equal(errors.maritalStatusId, undefined);
});

test("a record carrying only the older enum column is not asked again", () => {
  /* One fact in two columns. A customer filed before the list existed has
     `maritalStatus` and no id; demanding the id would re-ask a question that
     is already answered. */
  const errors = validateStepAgainstProfile(
    "basic",
    values({ maritalStatusId: "", maritalStatus: "married" }),
    profile({ requiresMaritalStatus: true })
  );

  assert.equal(errors.maritalStatusId, undefined);
});

test("whitespace is not an answer", () => {
  const errors = validateStepAgainstProfile(
    "basic",
    values({ maritalStatusId: "   ", maritalStatus: null }),
    profile({ requiresMaritalStatus: true })
  );

  assert.equal(errors.maritalStatusId, "Marital status is required for this account type.");
});

test("an account type that does not ask for it never blocks", () => {
  const errors = validateStepAgainstProfile(
    "basic",
    values({ maritalStatusId: "", maritalStatus: null }),
    profile()
  );

  assert.equal(errors.maritalStatusId, undefined);
});

test("a message about marital status routes to the step that shows it", () => {
  /* stepOwning reads a hand-written set, not STEP_FIELDS. Adding the field to
     one and not the other sends the officer to step two to look for a control
     that is on step one. */
  assert.equal(stepOwning("maritalStatusId"), "basic");
  assert.equal(stepOwning("maritalStatus"), "basic");
});
