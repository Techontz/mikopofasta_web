"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { notifyError, notifySuccess, promptReason } from "@/components/ui/notify";
import { api, backendUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";

const KYC_TONE: Record<string, "success" | "warning" | "danger"> = { approved: "success", pending: "warning", rejected: "danger" };

/**
 * Employee KYC (enhancement §12.2): a new employee's details wait for an HR user's approval; once approved only HR (never the
 * employee) changes them, with a reason that is audited with the old and new values.
 */
export function EmployeeKycCard({ employeeId, status, decidedAt, rejection }: { employeeId: number; status: string; decidedAt?: string | null; rejection?: string | null }) {
  const { user, can } = useAuth();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const canDecide = can("hrm.manage") && user?.id !== employeeId && status !== "approved";

  const decide = async (decision: "approve" | "reject") => {
    let body: { reason?: string } = {};
    if (decision === "reject") {
      const reason = await promptReason("What must be corrected?");
      if (!reason) {
        return;
      }
      body = { reason };
    }
    setBusy(true);
    try {
      await api.post(`hrm/staff/${employeeId}/kyc/${decision}`, body);
      await client.invalidateQueries();
      notifySuccess(decision === "approve" ? "Employee KYC approved" : "Employee KYC returned for correction");
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Employee KYC">
      <p className="mb-2">
        Status: <Badge tone={KYC_TONE[status] ?? "info"}>{status.toUpperCase()}</Badge>
        {decidedAt && <small className="text-muted ml-2">decided {decidedAt}</small>}
      </p>
      {rejection && status === "rejected" && <p className="text-danger mb-2">{rejection}</p>}
      {status === "approved" && <small className="text-muted d-block mb-2">Approved details (names, contacts, date of birth, photo) can only be changed by another HR user, with a reason.</small>}
      {canDecide && (
        <>
          <button type="button" className="btn btn-success btn-sm mr-2" disabled={busy} onClick={() => void decide("approve")}><i className="icon-check" /> Approve KYC</button>
          <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => void decide("reject")}><i className="icon-close" /> Return for correction</button>
        </>
      )}
    </Card>
  );
}

interface EmployeeDocument {
  id: number;
  type: string;
  type_label: string;
  name: string;
  size: number;
  uploaded_by: string | null;
  uploaded_at: string | null;
}

const DOCUMENT_TYPES = [
  { value: "cv", label: "CV" },
  { value: "certificate", label: "Certificates" },
  { value: "contract", label: "Employment Contract" },
];

/** CV, certificates and employment contract, PDF only (enhancement §12.1); every upload is kept. */
export function EmployeeDocumentsCard({ employeeId }: { employeeId: number }) {
  const client = useQueryClient();
  const { data: documents, isLoading } = useApi<EmployeeDocument[]>(`hrm/staff/${employeeId}/documents`);
  const [type, setType] = useState("cv");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!file) {
      return;
    }
    const body = new FormData();
    body.append("type", type);
    body.append("file", file);
    setBusy(true);
    try {
      await api.post(`hrm/staff/${employeeId}/documents`, body);
      await client.invalidateQueries();
      setFile(null);
      notifySuccess("Document uploaded");
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Documents">
      <div className="row">
        <Field label="Document:" className="col-md-4">
          <select className="form-control" value={type} onChange={(event) => setType(event.target.value)}>
            {DOCUMENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </Field>
        <Field label="PDF file:" className="col-md-5">
          <input type="file" className="form-control" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </Field>
        <div className="col-md-3 d-flex align-items-end mb-2">
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || !file} onClick={() => void upload()}><i className="icon-cloud-upload" /> Upload</button>
        </div>
      </div>
      <DataTable
        rows={documents}
        loading={isLoading}
        rowKey={(row) => row.id}
        emptyMessage="No documents uploaded yet."
        columns={[
          { key: "type_label", header: "Document" },
          { key: "name", header: "File" },
          { key: "uploaded_by", header: "Uploaded By" },
          { key: "uploaded_at", header: "Date" },
          { key: "action", header: "Action", sortable: false, render: (row) => <a className="btn btn-sm btn-outline-primary" href={backendUrl(`hrm/staff/${employeeId}/documents/${row.id}`)} target="_blank" rel="noopener noreferrer"><i className="icon-eye" /> Open</a> },
        ]}
      />
    </Card>
  );
}
