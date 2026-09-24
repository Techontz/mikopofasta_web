"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Field } from "@/components/ui/Field";
import { FileField } from "@/components/ui/FileField";
import { Modal } from "@/components/ui/Modal";
import { SelectBox } from "@/components/ui/SelectBox";
import { backendUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction } from "@/lib/hooks";

export type LegacyModule = "loan" | "penalty" | "salary_advance";

export const MODULE_LABELS: Record<LegacyModule, string> = {
  loan: "Loan File",
  penalty: "Penalty List",
  salary_advance: "Active Salary Advance",
};

const YEARS = Array.from({ length: 8 }, (_, index) => String(new Date().getFullYear() - index));

/**
 * "Export File" and "Import File" at the top of a module (Finance, Admin, Super Admin).
 *
 * Export asks for the branch only (Active Salary Advance, Penalty List) or branch + loan status + year (Loan File), and
 * downloads a CSV in exactly the columns the import reads. Import uploads a CSV / Excel file for a branch; it is checked
 * and opened as a preview (Legacy Imports), and changes no balance until someone else approves it.
 */
export function LegacyImportButtons({ module }: { module: LegacyModule }) {
  const { can } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  if (!can("legacy_imports.manage")) {
    return null;
  }

  return (
    <>
      <button type="button" className="btn btn-sm btn-success ml-1" onClick={() => setExporting(true)}>
        <i className="fa fa-download" /> Export File
      </button>
      <button type="button" className="btn btn-sm btn-primary ml-1" onClick={() => setImporting(true)}>
        <i className="fa fa-upload" /> Import File
      </button>
      {exporting && <ExportModal module={module} onClose={() => setExporting(false)} />}
      {importing && <ImportModal module={module} onClose={() => setImporting(false)} />}
    </>
  );
}

function ExportModal({ module, onClose }: { module: LegacyModule; onClose: () => void }) {
  const isLoan = module === "loan";
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("Active");
  const [year, setYear] = useState(YEARS[0]);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Export File — ${MODULE_LABELS[module]}`}
      submitLabel="Export"
      onSubmit={() => {
        if (!branch) {
          setError("Choose the branch to export.");
          return;
        }
        const query = new URLSearchParams({ module, branch_id: branch, ...(isLoan ? { loan_status: status, year } : {}) });
        window.location.href = backendUrl(`legacy-imports/export?${query.toString()}`);
        onClose();
      }}
    >
      <div className="row clearfix">
        <Field label="Branch" className="col-md-12" error={error ?? undefined} required>
          <SelectBox optionsUrl="options/branches" query={{ branches_only: 1 }} value={branch} onChange={(value) => { setBranch(value ?? ""); setError(null); }} />
        </Field>
        {isLoan && (
          <>
            <Field label="Loan Status" className="col-md-6" required>
              <SelectBox options={[{ value: "Active", label: "Active" }, { value: "Default", label: "Default" }]} value={status} onChange={(value) => setStatus(value ?? "Active")} />
            </Field>
            <Field label="Year" className="col-md-6" required>
              <SelectBox options={YEARS.map((value) => ({ value, label: value }))} value={year} onChange={(value) => setYear(value ?? YEARS[0])} />
            </Field>
          </>
        )}
      </div>
      <p className="text-muted small mb-0 mt-2">
        {isLoan
          ? "Loans of the branch with this status, withdrawn in or before the year. January–September are the loan repayments of each month of that year."
          : `The ${MODULE_LABELS[module]} of the branch, as shown on this page.`}
      </p>
    </Modal>
  );
}

interface UploadResult {
  data: { id: number };
}

function ImportModal({ module, onClose }: { module: LegacyModule; onClose: () => void }) {
  const router = useRouter();
  const isLoan = module === "loan";
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState(YEARS[0]);
  const [file, setFile] = useState<File | null>(null);
  const upload = useAction<FormData, UploadResult>("post", "legacy-imports");

  return (
    <Modal
      open
      onClose={onClose}
      title={`Import File — ${MODULE_LABELS[module]}`}
      submitLabel="Upload & Check"
      submitting={upload.isPending}
      onSubmit={() => {
        const body = new FormData();
        body.append("module", module);
        body.append("branch_id", branch);
        if (isLoan) {
          body.append("year", year);
        }
        if (file) {
          body.append("file", file);
        }
        upload.mutate(body, { onSuccess: (result) => router.push(`/imports/${result.data.id}`) });
      }}
    >
      <div className="row clearfix">
        <Field label="Branch" className={isLoan ? "col-md-8" : "col-md-12"} error={upload.fieldError("branch_id")} required>
          <SelectBox optionsUrl="options/branches" query={{ branches_only: 1 }} value={branch} onChange={(value) => setBranch(value ?? "")} />
        </Field>
        {isLoan && (
          <Field label="Year of the January–September columns" className="col-md-4" error={upload.fieldError("year")} required>
            <SelectBox options={YEARS.map((value) => ({ value, label: value }))} value={year} onChange={(value) => setYear(value ?? YEARS[0])} />
          </Field>
        )}
        <Field label="File (CSV or Excel .xlsx)" className="col-md-12" error={upload.fieldError("file") ?? upload.fieldError("module")} required>
          <FileField file={file} onChange={setFile} accept=".csv,.xlsx,text/csv" extensions={["csv", "txt", "xlsx"]} maxMb={10} />
        </Field>
      </div>
      <p className="text-muted small mb-0 mt-2">
        The file is checked row by row and opened as a preview. Nothing changes a balance until the import is sent for approval and approved by another authorised user.{" "}
        <a href={backendUrl(`legacy-imports/template?module=${module}`)}>Download an empty template</a>.
      </p>
    </Modal>
  );
}
