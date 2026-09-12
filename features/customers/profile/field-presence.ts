/**
 * Is there an answer here?
 *
 * The profile used to render every column the customer resource carries and
 * print an em dash wherever one was null, so a customer with a phone number
 * and nothing else filled four cards with forty dashes. Deciding what to show
 * needs one honest answer to "did anybody actually record this", and that
 * answer is NOT falsiness:
 *
 *   - `0` answers "how many dependants?" and "what is the take-home?".
 *   - `false` answers a yes/no question.
 *   - `"   "` is somebody's whitespace, not an answer.
 *   - `NaN` is a number that came from an unparseable input; nothing to show.
 *
 * The same rule the registration wizard already uses for its dynamic answers
 * (`features/customers/registration-wizard/dynamic-form.ts`), stated once here
 * for the read side.
 */
export function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return Number.isFinite(value);
  return true;
}

/** Does any of these keys hold an answer? Used to decide whether a block exists. */
export function anyPresent(
  values: Record<string, unknown>,
  keys: readonly string[]
): boolean {
  return keys.some((key) => isPresent(values[key]));
}
