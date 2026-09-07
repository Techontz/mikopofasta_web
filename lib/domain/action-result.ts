/** Shared return shape for every admin Server Action — one contract, everywhere. */
export interface ActionResult {
  ok: boolean;
  message?: string;
  /**
   * Field-level validation errors from the API, keyed by the FORM's field name.
   *
   * Optional, so every existing action keeps its current shape. It exists
   * because a 422 carries which field was wrong and why, and collapsing that
   * into a single toast throws the useful half away: an officer told "please
   * check the form" has to guess which of fifteen inputs the server objected
   * to. An action that populates this lets the form put the message under the
   * input it belongs to.
   */
  fieldErrors?: Record<string, string[]>;
}
