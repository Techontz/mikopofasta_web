"use client";

import Link from "next/link";
import { useState } from "react";

import { LegacyImportButtons, MODULE_LABELS, type LegacyModule } from "@/components/imports/LegacyImportButtons";
import { IMPORT_STATUS, importOutstanding, type LegacyImportSummary } from "@/components/imports/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { useApi } from "@/lib/hooks";

const MODULES: { value: "" | LegacyModule; label: string }[] = [
  { value: "", label: "All files" },
  { value: "loan", label: MODULE_LABELS.loan },
  { value: "penalty", label: MODULE_LABELS.penalty },
  { value: "salary_advance", label: MODULE_LABELS.salary_advance },
];

/**
 * Legacy Imports: every old-system file uploaded (Loan File, Penalty List, Active Salary Advance), with its audit record —
 * who uploaded, submitted, approved, rejected or rolled it back and when, and its counts and totals.
 */
export default function LegacyImportsPage() {
  const { can } = useAuth();
  const [module, setModule] = useState<"" | LegacyModule>("");
  const [status, setStatus] = useState("");
  const allowed = can(["legacy_imports.manage", "legacy_imports.approve"]);
  const { data: imports, isLoading } = useApi<LegacyImportSummary[]>(allowed ? "legacy-imports" : null, { module: module || undefined, status: status || undefined });

  return (
    <>
      <PageHeader crumbs={["Approvals", "Old System Imports"]} />
      <Card
        title="Old System Imports"
        actions={
          <div className="d-flex align-items-center">
            <select className="form-control form-control-sm mr-1" value={module} onChange={(event) => setModule(event.target.value as "" | LegacyModule)}>
              {MODULES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select className="form-control form-control-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(IMPORT_STATUS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
            </select>
            {module && <LegacyImportButtons module={module} />}
          </div>
        }
      >
        {!allowed ? (
          <div className="alert alert-warning mb-0">You do not have permission to view old-system imports.</div>
        ) : (
          <>
            <p className="text-muted small">
              Opening balances from the old system: the Loan File becomes outstanding principal, the Penalty List outstanding penalty and the Active Salary Advance list outstanding salary advance — three separate debts. Files are uploaded from the Export File / Import File buttons of each module and go live only when another authorised user approves them.
            </p>
            <DataTable
              rows={imports}
              loading={isLoading}
              rowKey={(row) => row.id}
              columns={[
                { key: "id", header: "#", render: (row) => <Link href={`/imports/${row.id}`}>#{row.id}</Link> },
                { key: "module_label", header: "File" },
                { key: "branch", header: "Branch" },
                { key: "file_name", header: "File Name", render: (row) => <Link href={`/imports/${row.id}`}>{row.file_name}</Link> },
                { key: "status", header: "Status", render: (row) => <Badge tone={IMPORT_STATUS[row.status].tone}>{IMPORT_STATUS[row.status].label}</Badge> },
                { key: "total_rows", header: "Records" },
                { key: "valid_rows", header: "Valid" },
                { key: "warning_rows", header: "Warnings" },
                { key: "error_rows", header: "Errors" },
                { key: "duplicate_rows", header: "Duplicates" },
                { key: "unmatched_rows", header: "Unmatched" },
                { key: "outstanding", header: "Outstanding", value: importOutstanding, render: (row) => money(importOutstanding(row)) },
                { key: "uploaded_by", header: "Uploaded", render: (row) => <>{row.uploaded_by}<br /><small className="text-muted">{row.uploaded_at}</small></> },
                {
                  key: "decided",
                  header: "Approved / Rejected",
                  render: (row) =>
                    row.approved_by ? <>{row.approved_by}<br /><small className="text-muted">{row.approved_at}</small></>
                    : row.rejected_by ? <>{row.rejected_by}<br /><small className="text-muted">{row.rejection_reason}</small></>
                    : "—",
                },
              ]}
            />
          </>
        )}
      </Card>
    </>
  );
}
