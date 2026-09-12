/**
 * Keeps the browser out of the registration form.
 *
 * WHY. Chrome classifies a form's fields by name, id and nearby label text,
 * then offers whatever it has saved under that classification. In a form that
 * asks for a name, a phone number, a street and an account number, it decides
 * it is looking at an address form and starts dropping the user's own saved
 * addresses into the boxes — and, worst of all, into the option list of the
 * Branch dropdown, which is not a text field at all but a control whose only
 * valid answers are the branches the API returned.
 *
 * Anything the browser adds to these controls is wrong by construction: an
 * officer registering a customer is not entering their own details, so the
 * browser's history of the officer is never the answer. Password managers are
 * told the same thing, through the opt-outs each of them reads.
 *
 * `autocomplete="off"` is necessary but not sufficient — Chrome is documented
 * to disregard it on fields it believes belong to an address form — so the
 * Combobox additionally carries a per-instance random `name`, which is the part
 * that actually defeats the classifier. Inputs bound to react-hook-form cannot
 * do that: their `name` is what binds them to the form.
 *
 * Spread FIRST, so an input that genuinely wants a browser hint can still set
 * one after it.
 */
export const NO_AUTOFILL = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "none",
  spellCheck: false,
  /* Password-manager opt-outs: 1Password, LastPass, Bitwarden, Dashlane. */
  "data-1p-ignore": "",
  "data-lpignore": "true",
  "data-bwignore": "",
  "data-form-type": "other",
} as const;
