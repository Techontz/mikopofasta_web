"use client";

import Link from "next/link";
import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { confirmAction, notifyError } from "@/components/ui/notify";
import { api } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";

interface ContactGroup {
  id: number;
  name: string;
  description: string | null;
  members_count: number;
}

interface Member {
  name: string | null;
  phone: string;
}

interface GroupForm {
  id?: number;
  name: string;
  description: string;
  members: string;
}

const EMPTY: GroupForm = { name: "", description: "", members: "" };

/** "0712345678, Juma" per line → members; the name after the comma is optional. */
function parseMembers(text: string): Member[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [phone, ...name] = line.split(/[,;\t]/);
    return { phone: phone.trim(), name: name.join(" ").trim() || null };
  });
}

/** Members back to the one-per-line text the form edits. */
function membersText(members: Member[]): string {
  return members.map((member) => (member.name ? `${member.phone}, ${member.name}` : member.phone)).join("\n");
}

/**
 * SMS Centre → Contact Groups: named lists of phone numbers (staff, agents, partners, anyone who is not a customer) to send
 * announcements to.
 */
export default function ContactGroupsPage() {
  const { data: groups, isLoading } = useApi<ContactGroup[]>("sms/contact-groups");
  const [form, setForm] = useState<GroupForm | null>(null);
  const create = useAction<{ name: string; description: string; members: Member[] }>("post", "sms/contact-groups");
  const update = useAction<{ id: number; name: string; description: string; members: Member[] }>("put", (body) => `sms/contact-groups/${body.id}`);
  const remove = useAction<{ id: number }>("delete", (body) => `sms/contact-groups/${body.id}`);
  const saving = form?.id ? update : create;
  const members = form ? parseMembers(form.members) : [];

  const edit = async (group: ContactGroup) => {
    try {
      const response = await api.get<{ data: { members: Member[] } }>(`sms/contact-groups/${group.id}`);
      setForm({ id: group.id, name: group.name, description: group.description ?? "", members: membersText(response.data.members) });
    } catch (error) {
      notifyError(error);
    }
  };

  const save = () => {
    if (!form) {
      return;
    }
    const body = { name: form.name, description: form.description, members };
    const done = { onSuccess: () => setForm(null) };
    if (form.id) {
      update.mutate({ ...body, id: form.id }, done);
    } else {
      create.mutate(body, done);
    }
  };

  /** "members.3.phone" → the line it came from, so the error points at the number to fix. */
  const memberErrors = Object.entries(saving.errors)
    .filter(([field]) => field.startsWith("members."))
    .map(([field, messages]) => `Line ${Number(field.split(".")[1]) + 1}: ${messages[0]}`);

  return (
    <>
      <PageHeader crumbs={["SMS Centre", "Contact Groups"]} />

      <Card title="Contact Groups" actions={<button type="button" className="btn btn-sm btn-primary" onClick={() => setForm(EMPTY)}><i className="icon-plus" /> New contact group</button>}>
        <DataTable
          rows={groups}
          loading={isLoading}
          rowKey={(row) => row.id}
          emptyMessage="No contact groups yet."
          columns={[
            { key: "sn", header: "S/No.", render: (_, index) => `${index + 1}.`, sortable: false },
            { key: "name", header: "Name" },
            { key: "description", header: "Description", render: (row) => row.description ?? "-" },
            { key: "members_count", header: "Numbers" },
            {
              key: "action",
              header: "Action",
              sortable: false,
              className: "text-nowrap",
              render: (row) => (
                <>
                  <Link href={`/sms/send?audience=contact_group&contact_group_id=${row.id}`} className="btn btn-sm btn-success mr-1"><i className="icon-paper-plane" /> Send SMS</Link>
                  <button type="button" className="btn btn-sm btn-icon btn-primary mr-1" onClick={() => void edit(row)}><i className="icon-pencil" /></button>
                  <button type="button" className="btn btn-sm btn-icon btn-danger" onClick={async () => (await confirmAction()) && remove.mutate({ id: row.id })}><i className="icon-trash" /></button>
                </>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={form !== null} onClose={() => setForm(null)} title={form?.id ? "Edit Contact Group" : "New Contact Group"} submitLabel="Save" submitting={saving.isPending} onSubmit={save} size="lg">
        {form && (
          <div className="row">
            <Field label="Group name:" required className="col-md-6" error={saving.fieldError("name")}>
              <input className="form-control" placeholder="e.g. Mawakala, Wafanyakazi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Description:" className="col-md-6" error={saving.fieldError("description")}>
              <input className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label={`Phone numbers (${members.length}):`} required className="col-md-12" error={saving.fieldError("members")}>
              <textarea className="form-control" rows={10} placeholder={"One number per line, name optional after a comma:\n0712345678, Juma Ali\n0754000111"} value={form.members} onChange={(e) => setForm({ ...form, members: e.target.value })} />
            </Field>
            {memberErrors.length > 0 && (
              <div className="col-md-12">
                <div className="alert alert-danger mb-0">{memberErrors.slice(0, 5).map((error) => <div key={error}>{error}</div>)}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
