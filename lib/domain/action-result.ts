/** Shared return shape for every admin Server Action — one contract, everywhere. */
export interface ActionResult {
  ok: boolean;
  message?: string;
}
