/**
 * Reference-number generators. Real backend equivalents would be DB
 * sequences/UUIDs; these produce the same human-readable formats
 * (docs/backend-architecture-specification.md examples like
 * "LN-2026-000991") deterministically from a running counter so seed data
 * and future mock mutations stay stable and collision-free.
 */

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

export function loanNumber(sequence: number, year = new Date().getFullYear()): string {
  return `LN-${year}-${pad(sequence, 6)}`;
}

export function paymentReference(sequence: number): string {
  return `PAY-${pad(sequence, 7)}`;
}

export function journalEntryNumber(sequence: number): string {
  return `JE-${pad(sequence, 7)}`;
}

export function disbursementBatchReference(loanSeq: number, attempt: number): string {
  return `VODA${loanSeq}${attempt > 1 ? `-R${attempt}` : ""}`;
}

export function customerNumber(sequence: number): string {
  return `CU-${pad(sequence, 6)}`;
}

export function employeeNumber(sequence: number): string {
  return `EMP-${pad(sequence, 4)}`;
}

export function transactionId(sequence: number): string {
  return `TXN${pad(sequence, 8)}`;
}
