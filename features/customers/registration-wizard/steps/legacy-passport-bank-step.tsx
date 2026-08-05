"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { CreditCard, FileText, HelpCircle, User } from "lucide-react";
import { FaceScanner } from "@/features/customers/registration-wizard/face-scanner/face-scanner";
import type { FaceScanReport } from "@/features/customers/registration-wizard/face-scanner/face-report";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import { FloatingPanel } from "@/components/ui/floating-panel";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { MasterDataOption } from "@/lib/api/master-data";

/**
 * Step 3 — Passport size & Bank Detail, in the legacy form's exact order.
 *
 *   (1). Upload Passport
 *        Passport size [file]        [preview]
 *
 *   (2). Bank card information
 *        Account name | Card number | Expiration month / year
 *        NIDA / Voter ID / Driver`s Licence | Work ID number | Upload Attachment (pdf)
 *
 * The two numbered sections, their headings and the field order are the
 * screenshots'. Both `(?)` help buttons are reproduced and both explain the
 * section they sit on — in the original they are decoration; here they say
 * something, because a control that exists must do something.
 *
 * THE CARD NUMBER IS NEVER STORED. The field is here because the legacy screen
 * has it, and what the officer types reaches the API — where it is immediately
 * reduced to its last four digits and the rest discarded. Keeping a full PAN
 * would put this application in PCI-DSS scope. The note under the field says so,
 * so nobody is surprised later by a statement showing only •••• 1111.
 *
 * The legacy "NIDA / Voter ID / Driver`s Licence number" is one box for three
 * different documents. It is rendered as one row of three, because a KYC record
 * that cannot say which document it holds is not evidence — and the officer
 * fills whichever the customer produced, exactly as before.
 */
export function LegacyPassportBankStep({
  banks,
  mobileMoneyProviders,
  passport,
  passportReport,
  onPassport,
  attachment,
  onAttachment,
}: {
  banks: MasterDataOption[];
  mobileMoneyProviders: MasterDataOption[];
  passport: File | null;
  /** The scan's measurements, kept alongside the image it graded. */
  passportReport: FaceScanReport | null;
  onPassport: (file: File | null, report: FaceScanReport | null) => void;
  attachment: File | null;
  onAttachment: (file: File | null) => void;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const passportUrl = React.useMemo(
    () => (passport ? URL.createObjectURL(passport) : null),
    [passport]
  );
  React.useEffect(() => {
    return () => {
      if (passportUrl) URL.revokeObjectURL(passportUrl);
    };
  }, [passportUrl]);

  const asOptions = (rows: MasterDataOption[]) =>
    rows.map((r) => ({ value: r.id, label: r.name }));

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------- (1). Upload Passport */}
      <section className="rounded-lg border p-5">
        <div className="mb-5 flex items-start justify-between">
          <h2 className="text-base font-semibold">(1).Upload Passport</h2>
          <Help text="A live face scan: five head positions on camera, checked for a single face, lighting, focus and distance. The validated frame becomes the customer\u2019s profile photo." />
        </div>

        {/*
          The legacy "Choose file" is gone. A passport photo that can be
          uploaded can be a photograph of a photograph; the scan asks the
          customer to turn their head through five positions on a live camera,
          which a printed face cannot do. The captured frame becomes their
          profile photo, so this section still ends with the same artefact.
        */}
        <FaceScanner
          capture={passport}
          report={passportReport}
          onCapture={onPassport}
          onClear={() => onPassport(null, null)}
        />

      </section>

      {/* --------------------------------------- (2). Bank card information */}
      <section className="rounded-lg border p-5">
        <div className="mb-2 flex items-start justify-between">
          <h2 className="text-base font-semibold">(2). Bank card information</h2>
          <Help text="The customer's bank account and card. The card number is not stored — only its last four digits are kept." />
        </div>

        {/* The legacy card/PDF marks, as text badges rather than the original
            bitmaps, which are not ours to redistribute. */}
        <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          <Mark icon={CreditCard} label="MasterCard" />
          <Mark icon={CreditCard} label="VISA" />
          <Mark icon={FileText} label="PDF" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FieldRow label="Account name" error={errors.accountName?.message}>
            <WithIcon icon={CreditCard}>
              <Input id="accountName" {...register("accountName")} />
            </WithIcon>
          </FieldRow>

          <FieldRow label="Card number" error={errors.cardNumber?.message}>
            <WithIcon icon={CreditCard}>
              <Input id="cardNumber" inputMode="numeric" autoComplete="off" {...register("cardNumber")} />
            </WithIcon>
            <p className="text-[11px] text-muted-foreground">
              Not stored. Only the last four digits are kept.
            </p>
          </FieldRow>

          <FieldRow label="Expiration" error={errors.cardExpiryMonth?.message ?? errors.cardExpiryYear?.message}>
            <div className="flex items-center gap-2">
              <Input
                id="cardExpiryMonth"
                placeholder="month"
                type="number"
                min="1"
                max="12"
                {...register("cardExpiryMonth", { valueAsNumber: true })}
              />
              <span className="text-muted-foreground">/</span>
              <Input
                id="cardExpiryYear"
                placeholder="year"
                type="number"
                min="2020"
                max="2099"
                {...register("cardExpiryYear", { valueAsNumber: true })}
              />
            </div>
          </FieldRow>
        </div>

        <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-3">
          <FieldRow label="NIDA / Voter ID / Driver`s Lisence number">
            <div className="space-y-2">
              <WithIcon icon={User}>
                <Input id="nationalIdNumber" placeholder="NIDA" {...register("nationalIdNumber")} />
              </WithIcon>
              <Input id="voterIdNumber" placeholder="Voter ID" {...register("voterIdNumber")} />
              <Input
                id="driverLicenceNumber"
                placeholder="Driver's Licence"
                {...register("driverLicenceNumber")}
              />
            </div>
          </FieldRow>

          <FieldRow label="Work ID number" error={errors.workIdNumber?.message}>
            <Input id="workIdNumber" {...register("workIdNumber")} />
          </FieldRow>

          <FieldRow label="Upload Attachment(pdf)">
            <div className="flex items-center gap-2 rounded-md border px-2 py-1.5">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Input
                id="attachmentFile"
                type="file"
                accept="application/pdf"
                className="border-0 p-0 shadow-none focus-visible:ring-0"
                onChange={(e) => onAttachment(e.target.files?.[0] ?? null)}
              />
            </div>
            {attachment && (
              <p className="text-[11px] text-muted-foreground">{attachment.name}</p>
            )}
          </FieldRow>
        </div>

        {/* Bank and mobile money — master data, not on the legacy screen as
            dropdowns but required by the columns behind it. */}
        <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
          <FieldRow label="Bank">
            <Combobox
              id="bankId"
              value={watch("bankId") || null}
              onChange={(v) => setValue("bankId", v ?? "")}
              options={asOptions(banks)}
              placeholder="Select bank"
              emptyMessage="No banks are configured."
            />
          </FieldRow>
          <FieldRow label="Mobile Money Provider">
            <Combobox
              id="mobileMoneyProviderId"
              value={watch("mobileMoneyProviderId") || null}
              onChange={(v) => setValue("mobileMoneyProviderId", v ?? "")}
              options={asOptions(mobileMoneyProviders)}
              placeholder="Select provider"
              emptyMessage="No providers are configured."
            />
          </FieldRow>
        </div>
      </section>
    </div>
  );
}

function Mark({ icon: Icon, label }: { icon: typeof CreditCard; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border px-2 py-1">
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

/** The legacy inputs carry a small icon in a box on their left. */
function WithIcon({ icon: Icon, children }: { icon: typeof CreditCard; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex-1 [&_input]:border-0 [&_input]:shadow-none [&_input]:focus-visible:ring-0">
        {children}
      </div>
    </div>
  );
}

function FieldRow({
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
      <Label className="font-semibold">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** The legacy `(?)`, which now explains its section instead of decorating it. */
function Help({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  return (
    <div ref={anchorRef}>
      <button
        type="button"
        aria-label="What is this section for?"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="text-destructive transition-opacity hover:opacity-70"
      >
        <HelpCircle className="size-5" aria-hidden />
      </button>
      {/* Portalled like every other panel — this one sits at the top right of a
          card, and the card's overflow-hidden cut it off just the same. */}
      <FloatingPanel
        anchorRef={anchorRef}
        open={open}
        onDismiss={() => setOpen(false)}
        matchWidth={false}
        align="end"
        className="w-64 rounded-md border bg-popover p-3 text-xs shadow-lg"
      >
        <p role="tooltip">{text}</p>
      </FloatingPanel>
    </div>
  );
}
