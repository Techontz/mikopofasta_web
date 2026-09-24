import type { BadgeTone } from "@/components/ui/Badge";

import type { LegacyModule } from "./LegacyImportButtons";

export type ImportStatus = "draft" | "pending_approval" | "approved" | "rejected" | "rolled_back";

export type RowStatus = "valid" | "warning" | "error" | "duplicate" | "unmatched" | "imported" | "rolled_back";

export interface LegacyImportSummary {
  id: number;
  module: LegacyModule;
  module_label: string;
  branch_id: number;
  branch: string | null;
  year: number | null;
  file_name: string;
  status: ImportStatus;
  total_rows: number;
  valid_rows: number;
  warning_rows: number;
  error_rows: number;
  duplicate_rows: number;
  unmatched_rows: number;
  totals: {
    importable_rows?: number;
    loan_outstanding?: number;
    penalty_outstanding?: number;
    salary_advance_outstanding?: number;
    loan_amount?: number;
    paid_amount?: number;
    active_loans?: number;
    active_outstanding?: number;
    default_loans?: number;
    default_outstanding?: number;
    total_issued?: number;
  };
  uploaded_by: string | null;
  uploaded_at: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  rolled_back_by: string | null;
  rolled_back_at: string | null;
  rollback_reason: string | null;
  journal_reference: string | null;
}

export interface LegacyImportDetail extends LegacyImportSummary {
  headers: string[];
  can_submit: boolean;
  can_approve: boolean;
  approve_blocked_reason: string | null;
  can_map: boolean;
  can_rollback: boolean;
  can_delete: boolean;
}

export interface LegacyImportRow {
  id: number;
  row_number: number;
  status: RowStatus;
  messages: string[];
  raw: Record<string, string>;
  customer_name: string | null;
  branch_name: string | null;
  phone: string | null;
  customer: { id: number; full_name: string; customer_number: string; phone: string | null; branch: string | null } | null;
  match_method: string | null;
  mapped_by: string | null;
  loan_amount: number | null;
  interest: number | null;
  total_payable: number | null;
  collection: number | null;
  paid_amount: number | null;
  remain_amount: number | null;
  penalty_amount: number | null;
  fee: number | null;
  duration_type: string | null;
  sessions: number | null;
  withdrawal_date: string | null;
  penalty_date: string | null;
  alert_date: string | null;
  loan_status: string | null;
  monthly: Record<string, number>;
  imported: { type: string; id: number; label: string; link: string | null } | null;
}

export const IMPORT_STATUS: Record<ImportStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "DRAFT", tone: "default" },
  pending_approval: { label: "PENDING APPROVAL", tone: "warning" },
  approved: { label: "APPROVED", tone: "success" },
  rejected: { label: "REJECTED", tone: "danger" },
  rolled_back: { label: "ROLLED BACK", tone: "dark" },
};

export const ROW_STATUS: Record<RowStatus, { label: string; tone: BadgeTone }> = {
  valid: { label: "VALID", tone: "success" },
  warning: { label: "WARNING", tone: "warning" },
  error: { label: "ERROR", tone: "danger" },
  duplicate: { label: "DUPLICATE", tone: "dark" },
  unmatched: { label: "UNMATCHED", tone: "info" },
  imported: { label: "IMPORTED", tone: "primary" },
  rolled_back: { label: "ROLLED BACK", tone: "default" },
};

/** The outstanding balance an import brings in, whichever of the three debts it carries. */
export function importOutstanding(row: LegacyImportSummary): number {
  return (row.totals.loan_outstanding ?? 0) + (row.totals.penalty_outstanding ?? 0) + (row.totals.salary_advance_outstanding ?? 0);
}
