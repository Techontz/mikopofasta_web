import { z } from "zod";

/**
 * A text field the form will not submit empty.
 *
 * The entity schemas in `types/` describe what the API returns, and they are
 * used to parse those responses — so a `name: z.string()` there is a statement
 * that the server sends a string, not that the user must type one. Six create
 * dialogs picked their form shape straight off those schemas and inherited the
 * looser reading: submitting the dialog with every field blank passed client
 * validation, went to the server, and came back a 422.
 *
 * That is wrong three times over. It costs a network round trip to learn
 * something the browser already knew; the answer arrives as a toast that
 * vanishes, instead of beside the field that is wrong; and two of those
 * responses were "The given data was invalid.", which does not even say which
 * field. Meanwhile the label already carried a required asterisk, so the form
 * was telling the user the field was required and then not acting like it.
 *
 * Tightening happens on the FORM schema, never on the entity schema, so
 * response parsing is untouched.
 *
 * `trim()` first: a field holding only spaces is empty to the person who typed
 * it, and it is what the API will say too.
 */
export const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);
