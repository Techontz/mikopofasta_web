"use client";

import { useState } from "react";

import { FilterModal, HeaderButton, type Filters } from "@/components/finance-b/FilterModal";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { FileField } from "@/components/ui/FileField";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { SelectBox } from "@/components/ui/SelectBox";
import { backendUrl } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";

interface VisaCustomer {
  id: number;
  branch: string | null;
  customer: string;
  phone: string | null;
  bank_account_name: string | null;
  bank_password: string | null;
}

interface ImportResult {
  data: { updated: number; unchanged: number; failed: Array<{ row: number; reason: string }> };
}

interface AccountForm {
  ac_name: string;
  ac_password: string;
}

export default function VisaPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [filtering, setFiltering] = useState(false);
  // "new" = Add: pick any customer and give them an account name and VISA by hand.
  const [editing, setEditing] = useState<VisaCustomer | "new" | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>({ ac_name: "", ac_password: "" });
  const { data: customers, isLoading } = useApi<VisaCustomer[]>("visa/customers", { branch_id: filters.branch_id });
  const update = useAction<AccountForm & { id: number }>("put", (body) => `visa/customers/${body.id}`);
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult["data"] | null>(null);
  const upload = useAction<FormData, ImportResult>("post", "visa/customers/import");
  const exportUrl = backendUrl(`visa/customers/export${filters.branch_id ? `?branch_id=${filters.branch_id}` : ""}`);

  return (
    <>
      <PageHeader crumbs={["Bank Account & password"]} />

      <Card
        title="Bank Account List"
        actions={
          <>
            <HeaderButton onClick={() => setFiltering(true)} />
            <button
              type="button"
              className="btn btn-sm btn-info ml-1"
              title="Add account & VISA manually"
              onClick={() => {
                setCustomerId("");
                setCustomerError(null);
                setForm({ ac_name: "", ac_password: "" });
                setEditing("new");
              }}
            >
              <i className="fa fa-plus" /> Add
            </button>
            <a className="btn btn-sm btn-success ml-1" href={exportUrl} title="Export to Excel">
              <i className="fa fa-download" /> Export
            </a>
            <button type="button" className="btn btn-sm btn-primary ml-1" title="Import from CSV / Excel" onClick={() => { setFile(null); setResult(null); setImporting(true); }}>
              <i className="fa fa-upload" /> Import
            </button>
          </>
        }
      >
        <DataTable
          rows={customers}
          loading={isLoading}
          rowKey={(row) => row.id}
          columns={[
            { key: "sn", header: "S/No.", render: (_, index) => `${index + 1}.`, value: (row) => row.id },
            { key: "branch", header: "Branch", render: (row) => row.branch?.toUpperCase() },
            { key: "customer", header: "Customer name" },
            { key: "phone", header: "Phone Number" },
            { key: "bank_account_name", header: "Account name" },
            { key: "bank_password", header: "VISA" },
            {
              key: "action",
              header: "Action",
              sortable: false,
              render: (row) => (
                <button
                  type="button"
                  className="btn btn-sm btn-icon btn-primary"
                  title="Edit"
                  onClick={() => {
                    setEditing(row);
                    setForm({ ac_name: row.bank_account_name ?? "", ac_password: row.bank_password ?? "" });
                  }}
                >
                  <i className="icon-pencil" />
                </button>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add Account & Password" : "Edit Account & Password"}
        submitLabel={editing === "new" ? "Save" : "Update"}
        submitting={update.isPending}
        onSubmit={() => {
          if (editing === null) {
            return;
          }
          const id = editing === "new" ? Number(customerId) : editing.id;
          if (!id) {
            setCustomerError("Select the customer.");
            return;
          }
          update.mutate({ ...form, id }, { onSuccess: () => setEditing(null) });
        }}
      >
        <div className="row clearfix">
          {editing === "new" && (
            <Field label="Customer" className="col-md-12" error={customerError ?? undefined} required>
              <SelectBox
                placeholder="Search Customer"
                optionsUrl="options/customers"
                query={{ with_code: 1 }}
                value={customerId}
                onChange={(value) => {
                  const picked = customers?.find((row) => String(row.id) === value);
                  setCustomerId(value ?? "");
                  setCustomerError(null);
                  // A customer already on the list opens with their current values.
                  setForm({ ac_name: picked?.bank_account_name ?? "", ac_password: picked?.bank_password ?? "" });
                }}
              />
            </Field>
          )}
          <Field label="Account Name" className="col-md-6" error={update.fieldError("ac_name")}>
            <input type="text" className="form-control" autoComplete="off" value={form.ac_name} onChange={(e) => setForm({ ...form, ac_name: e.target.value })} />
          </Field>
          <Field label="Password" className="col-md-6" error={update.fieldError("ac_password")}>
            <input type="text" className="form-control" autoComplete="off" value={form.ac_password} onChange={(e) => setForm({ ...form, ac_password: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={importing}
        onClose={() => setImporting(false)}
        title="Import Bank Accounts & VISA"
        submitLabel={result ? undefined : "Import"}
        submitting={upload.isPending}
        onSubmit={() => {
          const body = new FormData();
          if (file) {
            body.append("file", file);
          }
          upload.mutate(body, { onSuccess: (response) => setResult(response.data) });
        }}
      >
        {result ? (
          <>
            <p className="mb-2">
              <b>{result.updated}</b> updated, <b>{result.unchanged}</b> unchanged, <b>{result.failed.length}</b> failed.
            </p>
            {result.failed.length > 0 && (
              <ul className="text-danger small mb-0 pl-3">
                {result.failed.map((failure) => <li key={failure.row}>Row {failure.row}: {failure.reason}</li>)}
              </ul>
            )}
          </>
        ) : (
          <>
            <Field label="File (CSV or Excel .xlsx)" className="col-md-12 px-0" error={upload.fieldError("file")} required>
              <FileField file={file} onChange={setFile} accept=".csv,.xlsx,text/csv" extensions={["csv", "txt", "xlsx"]} maxMb={10} />
            </Field>
            <p className="text-muted small mb-0 mt-2">
              Use the columns of the Export file. Each row is matched by <b>Customer ID</b> (or <b>Phone Number</b> when the ID is blank) and
              its <b>Account Name</b> and <b>VISA</b> are saved. A blank cell keeps the current value. <a href={exportUrl}>Download the current list</a> to edit.
            </p>
          </>
        )}
      </Modal>

      <FilterModal open={filtering} onClose={() => setFiltering(false)} onApply={setFilters} branchLabel="Branch" branchPlaceholder="Select branch" submitLabel="filter" dates={false} />
    </>
  );
}
