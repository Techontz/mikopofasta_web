"use client";

import { useState } from "react";

import { CredentialsModal } from "@/components/shareholders/CredentialsModal";
import { credentialsFrom, type CredentialEntry } from "@/components/shareholders/credentials";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { notifySuccess } from "@/components/ui/notify";
import { PassportPhotoField } from "@/components/ui/PassportPhotoField";
import { useAction } from "@/lib/hooks";

export interface HolderForm {
  first_name: string;
  middle_name: string;
  last_name: string;
  share_mobile: string;
  share_email: string;
  share_sex: string;
  share_dob: string;
  passport_photo: File | null;
}

export const EMPTY_HOLDER: HolderForm = { first_name: "", middle_name: "", last_name: "", share_mobile: "", share_email: "", share_sex: "", share_dob: "", passport_photo: null };

/** Answer of POST capital/share-holders: the new shareholder, and the login account created for them. */
export interface RegisteredShareHolder {
  message: string;
  account?: { outcome: string; message: string };
  credentials?: unknown;
  data: { id: number; name: string };
}

/** Multipart body for the API (the photo is a file; editing spoofs PUT because PHP only parses multipart POST). */
export function toFormData(form: HolderForm, method: "POST" | "PUT"): FormData {
  const body = new FormData();
  for (const [key, value] of Object.entries(form)) {
    if (value instanceof File) {
      body.append(key, value);
    } else if (value !== null) {
      body.append(key, value);
    }
  }
  if (method === "PUT") {
    body.append("_method", "PUT");
  }
  return body;
}

export const holderName = (form: HolderForm) => [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(" ");

export function HolderFields({ form, setForm, fieldError, editing, currentPhoto }: { form: HolderForm; setForm: (form: HolderForm) => void; fieldError: (field: string) => string | undefined; editing?: boolean; currentPhoto?: string | null }) {
  const set = (field: keyof HolderForm) => (event: { target: { value: string } }) => setForm({ ...form, [field]: event.target.value });

  return (
    <div className="row">
      <div className="col-lg-9">
        <div className="row">
          <Field label=" First Name:" required className="col-md-4" error={fieldError("first_name")}>
            <input className="form-control" placeholder="First Name" autoComplete="off" value={form.first_name} onChange={set("first_name")} required />
          </Field>
          <Field label="Middle Name:" className="col-md-4" error={fieldError("middle_name")}>
            <input className="form-control" placeholder="Middle Name" autoComplete="off" value={form.middle_name} onChange={set("middle_name")} />
          </Field>
          <Field label=" Last Name:" required className="col-md-4" error={fieldError("last_name")}>
            <input className="form-control" placeholder="Last Name" autoComplete="off" value={form.last_name} onChange={set("last_name")} required />
          </Field>
          <Field label={editing ? " Mobile no:" : " Phone no:"} required className="col-md-4" error={fieldError("share_mobile")}>
            <input type="number" className="form-control" placeholder={editing ? "Mobile no" : "Phone no"} autoComplete="off" value={form.share_mobile} onChange={set("share_mobile")} required />
          </Field>
          <Field label=" Email:" required className="col-md-4" error={fieldError("share_email")}>
            <input type="email" className="form-control" placeholder="Email" autoComplete="off" value={form.share_email} onChange={set("share_email")} required />
          </Field>
          <Field label="Gender:" required className="col-md-4" error={fieldError("share_sex")}>
            <select className="form-control input-sm" value={form.share_sex} onChange={set("share_sex")}>
              {!editing && <option value="">Select gender</option>}
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
          <Field label="Date of Birth:" required className="col-md-4" error={fieldError("share_dob")}>
            <input type="date" className="form-control" value={form.share_dob} onChange={set("share_dob")} required />
          </Field>
        </div>
      </div>
      <Field label="Passport Size Image:" required={!editing} className="col-lg-3">
        <PassportPhotoField file={form.passport_photo} onChange={(file) => setForm({ ...form, passport_photo: file })} currentUrl={currentPhoto} error={fieldError("passport_photo")} required={!editing} />
      </Field>
    </div>
  );
}

/**
 * Register a shareholder without leaving the current page (same form and API as Capital → Shareholders). The new
 * shareholder's one-time login credentials are shown before `onRegistered` hands back their id.
 */
export function RegisterShareHolderModal({ open, onClose, onRegistered }: { open: boolean; onClose: () => void; onRegistered: (holder: { id: number; name: string }) => void }) {
  const [form, setForm] = useState<HolderForm>(EMPTY_HOLDER);
  const [credentials, setCredentials] = useState<CredentialEntry[] | null>(null);
  const create = useAction<FormData, RegisteredShareHolder>("post", "capital/share-holders", () => "");

  const close = () => {
    setForm(EMPTY_HOLDER);
    create.setErrors({});
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={close}
        title="Register Shareholder"
        size="xl"
        submitLabel="Save"
        submitting={create.isPending}
        onSubmit={() =>
          create.mutate(toFormData(form, "POST"), {
            onSuccess: (result) => {
              const entries = credentialsFrom(result, holderName(form));
              if (entries) {
                setCredentials(entries);
              } else {
                notifySuccess(`${result.message} — ${result.account?.message ?? ""}`);
              }
              onRegistered({ id: result.data.id, name: result.data.name });
              close();
            },
          })
        }
      >
        <HolderFields form={form} setForm={setForm} fieldError={create.fieldError} />
      </Modal>
      <CredentialsModal entries={credentials} onClose={() => setCredentials(null)} />
    </>
  );
}
