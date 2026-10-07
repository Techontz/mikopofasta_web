"use client";

import Link from "next/link";
import { useState } from "react";

import { MessageBox } from "@/components/sms/MessageBox";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Loading } from "@/components/ui/Loading";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { confirmAction } from "@/components/ui/notify";
import { useAction, useApi } from "@/lib/hooks";

interface SmsTemplate {
  id: number;
  key: string | null;
  type: "automatic" | "announcement";
  name: string;
  body: string;
  is_active: boolean;
  days: number | null;
  variables: string[];
}

interface TemplateForm {
  name: string;
  body: string;
  is_active: boolean;
  days: number | null;
}

/** When each automatic SMS goes out, in the words the staff see. */
function whenSent(template: SmsTemplate): string {
  switch (template.key) {
    case "payment_received":
      return "As soon as a repayment is received and posted to the customer's loan (teller cash once verified, bank, mobile money).";
    case "repayment_reminder":
      return template.days === 0 ? "Every morning at 08:00, to customers whose instalment is due today." : `Every morning at 08:00, ${template.days} day${template.days === 1 ? "" : "s"} before an instalment falls due.`;
    case "overdue_reminder":
      return `Every morning at 08:00, ${template.days} day${template.days === 1 ? "" : "s"} after a missed instalment that is still unpaid.`;
    default:
      return "";
  }
}

/**
 * SMS Centre → Templates: the wording of the automatic SMS (payment receipt, repayment reminder, overdue reminder) and the
 * announcement drafts staff load on Send SMS.
 */
export default function SmsTemplatesPage() {
  const { data: templates, isLoading } = useApi<SmsTemplate[]>("sms/templates");
  const [draft, setDraft] = useState<TemplateForm>({ name: "", body: "", is_active: true, days: null });
  const [editing, setEditing] = useState<SmsTemplate | null>(null);
  const [editForm, setEditForm] = useState<TemplateForm>({ name: "", body: "", is_active: true, days: null });

  const create = useAction<{ name: string; body: string }>("post", "sms/templates");
  const update = useAction<Partial<TemplateForm> & { id: number }>("put", (body) => `sms/templates/${body.id}`);
  const remove = useAction<{ id: number }>("delete", (body) => `sms/templates/${body.id}`);

  if (isLoading || !templates) {
    return <Loading />;
  }

  const automatic = templates.filter((template) => template.type === "automatic");
  const drafts = templates.filter((template) => template.type === "announcement");
  const openEdit = (template: SmsTemplate) => {
    setEditing(template);
    setEditForm({ name: template.name, body: template.body, is_active: template.is_active, days: template.days });
  };
  const save = () => {
    if (!editing) {
      return;
    }
    const body = editing.type === "automatic"
      ? { id: editing.id, body: editForm.body, is_active: editForm.is_active, ...(editing.days !== null ? { days: editForm.days ?? 0 } : {}) }
      : { id: editing.id, name: editForm.name, body: editForm.body };
    update.mutate(body, { onSuccess: () => setEditing(null) });
  };

  return (
    <>
      <PageHeader crumbs={["SMS Centre", "Templates"]} />

      <Card title="Automatic SMS">
        <p className="text-muted">The system sends these on its own. Edit the wording, change when reminders go out, or switch one off.</p>
        <div className="table-responsive">
          <table className="table table-bordered table-custom mb-0">
            <thead className="thead-info">
              <tr><th>SMS</th><th>When it is sent</th><th>Message</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {automatic.map((template) => (
                <tr key={template.id}>
                  <td className="font-weight-bold text-nowrap">{template.name}</td>
                  <td style={{ minWidth: 220 }}><small>{whenSent(template)}</small></td>
                  <td style={{ minWidth: 280, whiteSpace: "pre-wrap" }}>{template.body}</td>
                  <td><Badge tone={template.is_active ? "success" : "default"}>{template.is_active ? "ON" : "OFF"}</Badge></td>
                  <td><button type="button" className="btn btn-sm btn-icon btn-primary" onClick={() => openEdit(template)}><i className="icon-pencil" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="New Announcement Draft">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate({ name: draft.name, body: draft.body }, { onSuccess: () => setDraft({ ...draft, name: "", body: "" }) }); }}>
          <div className="row">
            <Field label="Draft name:" required className="col-md-4" error={create.fieldError("name")}>
              <input className="form-control" placeholder="e.g. Sikukuu, Ofa mpya, Mkutano" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
            </Field>
            <Field label="Message:" required className="col-md-8" error={create.fieldError("body")}>
              <MessageBox value={draft.body} onChange={(body) => setDraft({ ...draft, body })} variables={["name", "company"]} rows={3} />
            </Field>
          </div>
          <div className="text-center m-t-20">
            <button type="submit" className="btn btn-primary" disabled={create.isPending}><i className="icon-plus" /> Save draft</button>
          </div>
        </form>
      </Card>

      <Card title="Announcement Drafts" actions={<Link href="/sms/send" className="btn btn-sm btn-primary"><i className="icon-paper-plane" /> Send SMS</Link>}>
        <DataTable
          rows={drafts}
          rowKey={(row) => row.id}
          emptyMessage="No drafts yet."
          columns={[
            { key: "sn", header: "S/No.", render: (_, index) => `${index + 1}.`, sortable: false },
            { key: "name", header: "Name" },
            { key: "body", header: "Message", render: (row) => <span style={{ whiteSpace: "pre-wrap" }}>{row.body}</span> },
            {
              key: "action",
              header: "Action",
              sortable: false,
              className: "text-nowrap",
              render: (row) => (
                <>
                  <button type="button" className="btn btn-sm btn-icon btn-primary mr-1" onClick={() => openEdit(row)}><i className="icon-pencil" /></button>
                  <button type="button" className="btn btn-sm btn-icon btn-danger" onClick={async () => (await confirmAction()) && remove.mutate({ id: row.id })}><i className="icon-trash" /></button>
                </>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Edit — ${editing.name}` : ""} submitLabel="Update" submitting={update.isPending} onSubmit={save} size="lg">
        {editing && (
          <div className="row">
            {editing.type === "announcement" && (
              <Field label="Draft name:" required className="col-md-12" error={update.fieldError("name")}>
                <input className="form-control" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
              </Field>
            )}
            <Field label="Message:" required className="col-md-12" error={update.fieldError("body")}>
              <MessageBox value={editForm.body} onChange={(body) => setEditForm({ ...editForm, body })} variables={editing.variables} />
            </Field>
            {editing.type === "automatic" && editing.days !== null && (
              <Field label={editing.key === "overdue_reminder" ? "Days after the due date:" : "Days before the due date (0 = on the day):"} required className="col-md-6" error={update.fieldError("days")}>
                <input type="number" className="form-control" min={editing.key === "overdue_reminder" ? 1 : 0} max={30} value={editForm.days ?? 0} onChange={(e) => setEditForm({ ...editForm, days: Number(e.target.value) })} required />
              </Field>
            )}
            {editing.type === "automatic" && (
              <div className="col-md-12">
                <label className="fancy-checkbox mb-0">
                  <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} /> <span>ON — send this SMS automatically</span>
                </label>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
