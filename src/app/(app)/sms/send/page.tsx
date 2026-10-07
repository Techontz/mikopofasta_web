"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { MessageBox } from "@/components/sms/MessageBox";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { SelectBox, type Option } from "@/components/ui/SelectBox";
import { confirmAction, notifyError } from "@/components/ui/notify";
import { api } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";

type Audience = "customers" | "contact_group" | "numbers";

interface SmsOptions {
  customer_statuses: Option[];
  customer_groups: Option[];
  contact_groups: Option[];
  drafts: Array<{ id: number; name: string; body: string }>;
  variables: string[];
}

interface SendForm {
  audience: Audience;
  branch_id: string;
  customer_status: string;
  group_id: string;
  loan_status: string;
  contact_group_id: string;
  numbers: string;
  message: string;
}

interface Preview {
  count: number;
  invalid: number;
  sample: string | null;
  sample_phone: string | null;
}

const LOAN_STATUSES: Option[] = [
  { value: "any", label: "Any" },
  { value: "active", label: "Has a running loan" },
  { value: "overdue", label: "Overdue / default loan" },
  { value: "none", label: "No running loan" },
];

const AUDIENCES: Array<[Audience, string, string]> = [
  ["customers", "icon-users", "Customers"],
  ["contact_group", "icon-list", "Contact group"],
  ["numbers", "icon-phone", "Phone numbers"],
];

/**
 * SMS Centre → Send SMS: an announcement typed here or loaded from a draft, sent by hand to customers (by branch, status,
 * customer group, loan status), to a contact group, or to numbers typed in. Preview shows how many people it reaches.
 */
export default function SendSmsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SendSms />
    </Suspense>
  );
}

function SendSms() {
  const params = useSearchParams();
  const { data: options } = useApi<SmsOptions>("sms/options");
  const { data: balance } = useApi<{ balance: number | null; error: string | null }>("sms/balance");
  const [form, setForm] = useState<SendForm>({
    audience: (params.get("audience") as Audience) ?? "customers",
    branch_id: "all",
    customer_status: "all",
    group_id: "",
    loan_status: "any",
    contact_group_id: params.get("contact_group_id") ?? "",
    numbers: "",
    message: "",
  });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const send = useAction<SendForm>("post", "sms/send");

  const update = (patch: Partial<SendForm>) => {
    setForm({ ...form, ...patch });
    setPreview(null);
  };

  const runPreview = async () => {
    setPreviewing(true);
    try {
      const response = await api.post<{ data: Preview }>("sms/preview", form);
      setPreview(response.data);
      return response.data;
    } catch (error) {
      notifyError(error);
      return null;
    } finally {
      setPreviewing(false);
    }
  };

  const submit = async () => {
    const result = preview ?? (await runPreview());
    if (!result) {
      return;
    }
    if (result.count === 0) {
      notifyError(new Error("No recipient with a valid phone number matches your selection."));
      return;
    }
    if (await confirmAction(`Send this SMS to ${result.count.toLocaleString()} people?`, result.sample ?? undefined)) {
      send.mutate(form, { onSuccess: () => { setForm({ ...form, message: "" }); setPreview(null); } });
    }
  };

  return (
    <>
      <PageHeader
        crumbs={["SMS Centre", "Send SMS"]}
        right={
          balance && (
            <div className="bh_chart d-inline-block">
              <small>SMS BALANCE</small>
              <h6 className="mb-0 mt-1" title={balance.error ?? undefined}><i className="icon-envelope" /> {balance.balance !== null ? balance.balance.toLocaleString() : "—"}</h6>
            </div>
          )
        }
      />

      <Card title="Send SMS / Announcement">
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="mf-label mb-2">Send to:</div>
          <div className="btn-group mb-3 flex-wrap" role="group">
            {AUDIENCES.map(([value, icon, label]) => (
              <button type="button" key={value} className={`btn ${form.audience === value ? "btn-primary" : "btn-outline-primary"}`} onClick={() => update({ audience: value })}>
                <i className={icon} /> {label}
              </button>
            ))}
          </div>

          {form.audience === "customers" && (
            <div className="row">
              <Field label="Branch:" className="col-lg-3 col-md-6" error={send.fieldError("branch_id")}>
                <SelectBox inputId="sms-branch" optionsUrl="options/branches" query={{ with_all: 1 }} value={form.branch_id} onChange={(value) => update({ branch_id: value ?? "all" })} />
              </Field>
              <Field label="Customer status:" className="col-lg-3 col-md-6">
                <SelectBox inputId="sms-status" options={[{ value: "all", label: "ALL" }, ...(options?.customer_statuses ?? [])]} value={form.customer_status} onChange={(value) => update({ customer_status: value ?? "all" })} />
              </Field>
              <Field label="Customer group:" className="col-lg-3 col-md-6">
                <SelectBox inputId="sms-group" placeholder="All groups" isClearable options={options?.customer_groups ?? []} value={form.group_id} onChange={(value) => update({ group_id: value ?? "" })} />
              </Field>
              <Field label="Loan:" className="col-lg-3 col-md-6">
                <SelectBox inputId="sms-loan" options={LOAN_STATUSES} value={form.loan_status} onChange={(value) => update({ loan_status: value ?? "any" })} />
              </Field>
            </div>
          )}

          {form.audience === "contact_group" && (
            <div className="row">
              <Field label="Contact group:" required className="col-md-6" error={send.fieldError("contact_group_id")}>
                <SelectBox inputId="sms-contact-group" placeholder="Select contact group" options={options?.contact_groups ?? []} value={form.contact_group_id} onChange={(value) => update({ contact_group_id: value ?? "" })} />
              </Field>
              <div className="col-md-6 d-flex align-items-end pb-3">
                <Link href="/sms/contact-groups" className="btn btn-link px-0"><i className="icon-plus" /> Create or edit contact groups</Link>
              </div>
            </div>
          )}

          {form.audience === "numbers" && (
            <div className="row">
              <Field label="Phone numbers:" required className="col-md-12" error={send.fieldError("numbers")}>
                <textarea className="form-control" rows={3} placeholder="0712345678, 0754000111 — separate with commas, spaces or new lines" value={form.numbers} onChange={(e) => update({ numbers: e.target.value })} />
              </Field>
            </div>
          )}

          <div className="row">
            <Field label="Load a draft:" className="col-md-6">
              <SelectBox
                inputId="sms-draft"
                placeholder={options?.drafts.length ? "Select a saved draft" : "No drafts yet — create them under Templates"}
                options={(options?.drafts ?? []).map((draft) => ({ value: String(draft.id), label: draft.name }))}
                value={null}
                onChange={(value) => { const draft = options?.drafts.find((item) => String(item.id) === value); if (draft) { update({ message: draft.body }); } }}
              />
            </Field>
            <Field label="Message:" required className="col-md-12" error={send.fieldError("message")}>
              <MessageBox value={form.message} onChange={(message) => update({ message })} variables={options?.variables ?? ["name", "company"]} />
            </Field>
          </div>

          {send.fieldError("audience") && <div className="alert alert-danger mt-2">{send.fieldError("audience")}</div>}

          {preview && (
            <div className="alert alert-info mt-3 mb-0">
              <b>{preview.count.toLocaleString()}</b> recipient{preview.count === 1 ? "" : "s"}
              {preview.invalid > 0 && <> · {preview.invalid} invalid number{preview.invalid === 1 ? "" : "s"} will be skipped</>}
              {preview.sample && (
                <div className="mt-2">
                  <small className="text-muted d-block">First message ({preview.sample_phone}):</small>
                  <span style={{ whiteSpace: "pre-wrap" }}>{preview.sample}</span>
                </div>
              )}
            </div>
          )}

          <div className="text-center m-t-20">
            <button type="button" className="btn btn-default mr-2" disabled={previewing} onClick={() => void runPreview()}><i className="icon-eye" /> Preview</button>
            <button type="submit" className="btn btn-primary" disabled={send.isPending || previewing || !form.message.trim()}><i className="icon-paper-plane" /> Send SMS</button>
          </div>
        </form>
      </Card>

      <Card title="Automatic SMS">
        <p className="mb-0">
          Payment receipts (rejesho), repayment reminders and overdue reminders are sent by the system on their own. Edit their wording, timing or switch them off under{" "}
          <Link href="/sms/templates">SMS Centre → Templates</Link>. Every SMS sent is listed in the <Link href="/sms/logs">SMS Log</Link>.
        </p>
      </Card>
    </>
  );
}
