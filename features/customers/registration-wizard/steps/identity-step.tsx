"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { FileText, IdCard, Info, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import type { MasterDataOption } from "@/lib/api/master-data";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";
import type { ExternalVerificationState } from "@/types/customer";

/**
 * Step 3 — Identity & Documents.
 *
 * THE DISTINCTION THIS STEP EXISTS TO KEEP. Capturing an identity document and
 * verifying it against the national registry are two different facts, and the
 * system must never let them collapse into one. What the officer records here
 * is what the customer produced. Whether the National Identification Authority
 * confirms it is a separate question, and today the answer is that nobody
 * asked — there is no NIDA integration in this deployment.
 *
 * So the banner says exactly that, and it is driven by the API's own report of
 * what this installation can do (`externalVerification`), not by a constant in
 * the frontend. If the integration is switched on, the banner changes without
 * anything here being edited. Nothing on this screen ever claims a check ran.
 *
 * The previous flow had a NIDA "lookup" that resolved a number to a name by
 * hashing it — a simulator producing invented people. It is not reachable from
 * this wizard. Identity is typed by the officer from the document in their
 * hand, which is the honest description of what actually happens.
 *
 * ANY ONE DOCUMENT SATISFIES THE REQUIREMENT. A microfinance customer may hold
 * a NIDA card, a voter's card, a driving licence, a passport or a work ID.
 * Demanding a specific one would exclude people who are perfectly well
 * identified by another.
 */
export function IdentityStep({
  profile,
  externalVerification,
  documentTypes,
  attachment,
  attachmentType,
  onAttachment,
  onAttachmentType,
}: {
  profile: AccountTypeRequirementProfile;
  externalVerification: { nida: ExternalVerificationState; otp: ExternalVerificationState };
  /** The admin-managed list; `code` is what the API files the document under. */
  documentTypes: MasterDataOption[];
  attachment: File | null;
  attachmentType: string;
  onAttachment: (file: File | null) => void;
  onAttachmentType: (code: string) => void;
}) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const documents = [
    watch("nidaNumber"),
    watch("nationalIdNumber"),
    watch("voterIdNumber"),
    watch("driverLicenceNumber"),
    watch("passportNumber"),
    watch("workIdNumber"),
  ];
  const hasDocument = documents.some((d) => typeof d === "string" && d.trim() !== "");

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold">Identity &amp; Documents</h2>

      {/* ------------------------------------- what this deployment can verify */}
      <div className="space-y-2">
        <IntegrationNotice
          title="NIDA registry verification"
          state={externalVerification.nida}
          required={profile.requiresNidaVerification}
        />
        <IntegrationNotice
          title="SMS one-time code"
          state={externalVerification.otp}
          required={profile.requiresOtpVerification}
        />
      </div>

      {/* ------------------------------------------------------ the documents */}
      <section className="space-y-4 rounded-lg border p-4">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <IdCard className="size-4 text-muted-foreground" aria-hidden />
            Identity documents
          </h3>
          <p className="text-xs text-muted-foreground">
            {profile.requiresIdentityDocument
              ? "At least one is required. Record whichever the customer produced."
              : "Record whichever the customer produced."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="National ID (NIDA) number"
            error={errors.nidaNumber?.message ?? errors.nationalIdNumber?.message}
          >
            <Input id="nidaNumber" placeholder="20 digits" {...register("nidaNumber")} />
            <p className="text-[11px] text-muted-foreground">
              Captured as recorded. Not checked against the registry.
            </p>
          </Field>
          <Field label="Voter ID number" error={errors.voterIdNumber?.message}>
            <Input id="voterIdNumber" {...register("voterIdNumber")} />
          </Field>
          <Field label="Driver&apos;s Licence number" error={errors.driverLicenceNumber?.message}>
            <Input id="driverLicenceNumber" {...register("driverLicenceNumber")} />
          </Field>
          <Field label="Passport number" error={errors.passportNumber?.message}>
            <Input id="passportNumber" {...register("passportNumber")} />
          </Field>
          <Field label="Work ID number" error={errors.workIdNumber?.message}>
            <Input id="workIdNumber" {...register("workIdNumber")} />
          </Field>
          <Field label="TIN number" error={errors.tinNumber?.message}>
            <Input id="tinNumber" {...register("tinNumber")} />
          </Field>
        </div>

        {profile.requiresIdentityDocument && !hasDocument && (
          <p className="text-xs text-destructive">
            At least one identity document is required — National ID, voter ID, driving licence,
            passport or work ID.
          </p>
        )}
      </section>

      {/* ------------------------------------------------------- attachment */}
      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="size-4 text-muted-foreground" aria-hidden />
          Supporting document
        </h3>
        <p className="text-xs text-muted-foreground">
          Optional. Filed against the customer&apos;s documents once the record is saved. More can
          be added from their profile at any time.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Document type">
            {/*
              Chosen from the admin-managed list, not typed. A category's
              `required_documents` names these exact codes, so a document filed
              under anything else satisfies nothing — which is why the API
              stopped accepting free text here.
            */}
            <Combobox
              id="attachmentType"
              value={attachmentType || null}
              onChange={(v) => onAttachmentType(v ?? "")}
              options={documentTypes.map((d) => ({ value: d.code, label: d.name }))}
              placeholder="Select document type"
              emptyMessage="No document types are configured."
            />
          </Field>

          <Field label="File (PDF or image, max 10 MB)">
            <div className="flex items-center gap-2 rounded-md border px-2 py-1.5">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Input
                id="attachmentFile"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="border-0 p-0 shadow-none focus-visible:ring-0"
                onChange={(e) => onAttachment(e.target.files?.[0] ?? null)}
              />
            </div>
            {attachment && <p className="text-[11px] text-muted-foreground">{attachment.name}</p>}
            {attachment && !attachmentType && (
              <p className="text-xs text-destructive">
                Choose a document type, or the file cannot be filed.
              </p>
            )}
          </Field>
        </div>
      </section>
    </div>
  );
}

/**
 * What an integration can and cannot do, stated plainly.
 *
 * The `required` case is the one worth being loud about: a profile demanding a
 * check this deployment cannot perform will stall every customer at KYC, and
 * that is a configuration problem an officer cannot solve by trying harder.
 */
function IntegrationNotice({
  title,
  state,
  required,
}: {
  title: string;
  state: ExternalVerificationState;
  required: boolean;
}) {
  if (state.available) {
    return (
      <p className="flex items-start gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          <span className="font-medium text-foreground">{title}:</span> {state.note}
        </span>
      </p>
    );
  }

  const blocking = required;

  return (
    <p
      role={blocking ? "alert" : undefined}
      className={
        blocking
          ? "flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          : "flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
      }
    >
      <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        <span className="font-medium">{title}:</span> {state.note}
        {blocking && (
          <>
            {" "}
            This account type is configured to require it, so KYC cannot be completed until an
            administrator turns the requirement off or the integration is connected.
          </>
        )}
        {!blocking && " Registration continues normally."}
      </span>
    </p>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
