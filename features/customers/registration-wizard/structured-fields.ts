import {
  NUMERIC_STRUCTURED_TARGETS,
  STRUCTURED_TARGETS,
  type DynamicFormField,
  type StructuredTarget,
} from "@/types/customer";

export { STRUCTURED_TARGETS, type StructuredTarget };

/**
 * Compile-time proof that every storage target names a real field on the
 * wizard's form. Without it, a typo in the shared list would bind a control to
 * a field that does not exist and lose the answer silently — which is the class
 * of bug this file exists to prevent.
 */
type TargetsAreWizardFields = StructuredTarget extends keyof WizardValues ? true : never;
const _targetsAreWizardFields: TargetsAreWizardFields = true;
void _targetsAreWizardFields;
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";

/**
 * The mirror of the API's StructuredRegistrationField — the registration fields
 * a configured question may write to instead of the JSON bag.
 *
 * A field whose `storesIn` names one of these is bound to that wizard field, so
 * the value travels in the registration payload under its own name and the API
 * writes it to its column: indexed, typed, and visible to every report that
 * already reads it. A field without `storesIn` goes into `dynamicFormData`,
 * which is what the JSON column is for.
 *
 * That is how §26 is answered without a migration per field: an administrator
 * adding "Land Size" gets JSON, one adding "Basic Salary" and pointing it at
 * `basicSalary` gets `customers.basic_salary`, and neither needs a line of code.
 *
 * DECLARED, NEVER INFERRED FROM THE KEY. Treating a key that happens to match a
 * column as an instruction to write that column would silently relocate the
 * answers of every customer type already configured with such a key, and would
 * let an administrator overwrite a real column by accident simply by naming a
 * field the same thing. Where an answer is kept is a decision, so the
 * administration screen asks for it.
 *
 * KEPT IN STEP WITH THE API BY THE API, which validates `storesIn` against its
 * own copy of this list and refuses anything it does not recognise. This copy
 * exists because the browser has to know where to BIND the control, which is a
 * question the server cannot answer.
 */

const TARGETS = new Set<string>(Object.keys(STRUCTURED_TARGETS));

const NUMERIC_TARGETS = new Set<string>(NUMERIC_STRUCTURED_TARGETS);

/** The wizard field a configured question writes to, or null for the JSON store. */
export function structuredNameFor(
  field: Pick<DynamicFormField, "storesIn">
): keyof WizardValues | null {
  const target = field.storesIn;
  /* A target the application no longer offers is treated as absent rather than
     as an error: the answer files itself in the JSON store and the registration
     goes through, which beats refusing every customer of that type. */
  return target != null && TARGETS.has(target) ? (target as keyof WizardValues) : null;
}

export function isNumericTarget(name: keyof WizardValues): boolean {
  return NUMERIC_TARGETS.has(name);
}

/**
 * Where a field's error will be reported, which is where its control must
 * announce itself.
 *
 * The API keys a rejection by the payload name for a structured field and by
 * `dynamicFormData.<key>` for the rest, and React Hook Form stores errors under
 * the same paths — so this one function decides both what the renderer reads
 * and what the wizard's error-focusing scrolls to.
 */
export function errorPathFor(field: Pick<DynamicFormField, "key" | "storesIn">): string {
  return structuredNameFor(field) ?? `dynamicFormData.${field.key}`;
}
