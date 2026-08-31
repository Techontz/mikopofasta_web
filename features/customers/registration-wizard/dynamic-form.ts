import { errorPathFor } from "@/features/customers/registration-wizard/structured-fields";
import type { DynamicFormField } from "@/types/customer";
import type { MasterDataList, MasterDataOption } from "@/types/master-data";

/** Reads one field's current answer, wherever the form happens to store it. */
export type ReadAnswer = (field: DynamicFormField) => unknown;

export type Lookups = Record<MasterDataList, MasterDataOption[]>;

function isBlank(value: unknown): boolean {
  /* `false` answers a yes/no question and `0` answers "how many?"; neither is
     a missing value, which is why this is not a falsiness check. */
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

/**
 * The stable code behind an answer, for a condition to compare against.
 *
 * A data-source select holds a row ID, and a rule written against an ID would
 * break the moment the same configuration ran on another database. So the ID is
 * resolved back to the row's code — "TEMPORARY" — which an administrator may
 * not change and which survives the label being renamed or translated.
 *
 * A fixed-option select holds its own string and is compared as it stands.
 * A cadre from a parented list cannot be resolved here (the list is fetched on
 * demand and is not on the page), so its raw value is used; conditions are not
 * written against cadres.
 */
export function codeOfAnswer(
  field: DynamicFormField,
  value: unknown,
  lookups: Lookups
): string | null {
  if (isBlank(value)) return null;

  const raw = String(value);

  if (field.dataSource == null || field.dataSource === "sector-categories") return raw;

  const row = (lookups[field.dataSource] ?? []).find((r) => r.id === raw);
  return row?.code ?? raw;
}

/**
 * Whether a field must be answered, given what has been answered so far.
 *
 * Either its own flag, or a `requiredWhen` naming another field and the codes
 * that make this one mandatory — the contract expiry a temporary contract
 * demands and a permanent one does not. §25: the rule is configuration, and
 * this is the only place that reads it.
 */
export function isFieldRequired(
  field: DynamicFormField,
  fields: DynamicFormField[],
  read: ReadAnswer,
  lookups: Lookups
): boolean {
  if (field.required) return true;

  const condition = field.requiredWhen;
  if (!condition || condition.equals.length === 0) return false;

  const other = fields.find((f) => f.key === condition.field);
  if (!other) return false;

  const value = read(other);
  if (isBlank(value)) return false;

  /* The raw answer or its code — a fixed-option select stores the first and a
     data-source select the second, and a rule should not have to know which. */
  if (condition.equals.includes(String(value))) return true;

  const code = codeOfAnswer(other, value, lookups);
  return code !== null && condition.equals.includes(code);
}

/**
 * What is still missing, keyed the way React Hook Form and the API both key it.
 *
 * THE SERVER IS THE ENFORCEMENT — DynamicFormValidator judges the same schema
 * against the same rules. This exists so an unanswered required question is
 * pointed at on the step that asks it, rather than surfacing as a rejection
 * after the officer has moved on.
 */
export function missingDynamicAnswers(
  fields: DynamicFormField[],
  read: ReadAnswer,
  lookups: Lookups
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (!isFieldRequired(field, fields, read, lookups)) continue;
    if (!isBlank(read(field))) continue;

    errors[errorPathFor(field)] = `${field.label} is required.`;
  }

  return errors;
}
