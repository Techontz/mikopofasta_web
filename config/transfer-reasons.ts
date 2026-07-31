/**
 * The reasons a bank transfer can be filed under.
 *
 * A fixed vocabulary rather than a fixture: these are the choices the Transfer
 * Balance screens offer, and the backend stores whichever was picked as free
 * text on `bank_transfers.reason`. Kept in config/ rather than lib/mock-data/
 * because nothing about it is a placeholder — it is the list, and it moved here
 * when the rest of that fixture file was replaced by the API.
 */
export const TRANSFER_REASONS = [
  "Branch float top-up",
  "Salary advance funding",
  "Disbursement funding",
  "Operational expenses",
  "Bank charges settlement",
] as const;

export type TransferReason = (typeof TRANSFER_REASONS)[number];
