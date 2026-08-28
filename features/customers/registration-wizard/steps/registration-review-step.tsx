"use client";

import { useFormContext } from "react-hook-form";
import { BadgeCheck, CircleAlert, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  WizardStepId,
  WizardValues,
} from "@/features/customers/registration-wizard/wizard-schema";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";
import type { MasterDataOption } from "@/lib/api/master-data";
import type { Branch } from "@/types/branch";
import type { CustomerCategory, ExternalVerificationState } from "@/types/customer";

/**
 * Step 5 — Review & Save.
 *
 * Everything the officer entered, grouped by the step it came from, with a
 * link back to that step beside each group. The previous review page listed
 * twelve of forty fields and offered no way back except the Back button
 * pressed four times, which is why nobody used it to check anything.
 *
 * The completeness list at the top is computed from the SAME account-type
 * profile the API validates against, so what it says is outstanding is what
 * the save will actually refuse. Face verification appears on it as expected
 * and NOT outstanding: it is step six, it happens after this record is
 * created, and it is the one item the officer is not being asked to fix here.
 */
export function RegistrationReviewStep({
  profile,
  branches,
  categories,
  lookups,
  documents,
  externalVerification,
  onEditStep,
}: {
  profile: AccountTypeRequirementProfile;
  branches: Branch[];
  categories: CustomerCategory[];
  lookups: {
    loanTypes: MasterDataOption[];
    customerTypes: MasterDataOption[];
    accountTypes: MasterDataOption[];
    maritalStatuses: MasterDataOption[];
    banks: MasterDataOption[];
    idTypes: MasterDataOption[];
    sectors: MasterDataOption[];
    employers: MasterDataOption[];
    /* The cadres of the chosen sector only — the list is per-sector and has no
       flat form. Empty until a sector is picked. */
    sectorCategories: MasterDataOption[];
    contractTypes: MasterDataOption[];
  };
  /* One entry per file chosen on the documents step, so the review shows what
     will actually be uploaded rather than only what was asked for. */
  documents: { code: string; name: string }[];
  externalVerification: { nida: ExternalVerificationState; otp: ExternalVerificationState };
  onEditStep: (step: WizardStepId) => void;
}) {
  const { watch } = useFormContext<WizardValues>();
  const v = watch();

  const name = (rows: MasterDataOption[], id: string | null | undefined) =>
    rows.find((r) => r.id === id)?.name ?? "—";

  const branch = branches.find((b) => b.id === v.branchId);
  const category = categories.find((c) => c.id === v.customerCategoryId);

  const fullName = [v.firstName, v.middleName, v.lastName].filter(Boolean).join(" ");
  const identityDocuments = [
    ["National ID", v.nidaNumber || v.nationalIdNumber],
    ["Voter ID", v.voterIdNumber],
    ["Driving licence", v.driverLicenceNumber],
    ["Passport", v.passportNumber],
    ["Work ID", v.workIdNumber],
  ].filter(([, value]) => typeof value === "string" && value.trim() !== "");

  /* The same rules the API applies. See wizard-schema.ts. */
  const outstanding: string[] = [];
  if (profile.requiresAddress && !v.regionId) outstanding.push("Region");
  if (profile.requiresAddress && !v.districtId) outstanding.push("District");
  if (profile.requiresIdentityDocument && identityDocuments.length === 0)
    outstanding.push("An identity document");
  if (profile.requiresMaritalStatus && !v.maritalStatusId && !v.maritalStatus)
    outstanding.push("Marital status");
  if (profile.requiresCustomerCategory && !v.customerCategoryId) outstanding.push("Customer category");
  if (profile.requiresBankAccount && !v.bankDetails?.accountNumber && !v.walletNumber)
    outstanding.push("A bank account or mobile money wallet");
  if (profile.requiresCardDetails && !v.cardNumber) outstanding.push("Card details");
  if (v.guarantors.length < profile.minGuarantors)
    outstanding.push(`${profile.minGuarantors} guarantor(s)`);
  if (v.nextOfKin.length < profile.minNextOfKin)
    outstanding.push(`${profile.minNextOfKin} next of kin`);

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold">Review &amp; Save</h2>

      {/* --------------------------------------------------- what is missing */}
      {outstanding.length > 0 ? (
        <div
          role="alert"
          className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
            <CircleAlert className="size-4" aria-hidden />
            Still required before this registration can be saved
          </p>
          <ul className="ml-6 list-disc space-y-0.5 text-sm text-destructive">
            {outstanding.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          <BadgeCheck className="size-4 shrink-0" aria-hidden />
          Everything this account type requires has been captured. Saving creates the customer and
          moves them to Face Verification.
        </p>
      )}

      {/* ------------------------------------------ what is honestly unverified */}
      <div className="space-y-1.5 rounded-lg border p-4 text-xs text-muted-foreground">
        <p className="text-sm font-medium text-foreground">Verification status</p>
        <p>
          <span className="font-medium text-foreground">Identity documents:</span>{" "}
          {identityDocuments.length > 0
            ? `captured (${identityDocuments.map(([label]) => label).join(", ")})`
            : "none captured"}
          {". "}
          {externalVerification.nida.note}
        </p>
        <p>
          <span className="font-medium text-foreground">Phone number:</span>{" "}
          {v.phone ? `captured (${v.phone})` : "not captured"}
          {". "}
          {externalVerification.otp.note}
        </p>
        <p>
          <span className="font-medium text-foreground">Face liveness:</span>{" "}
          {profile.requiresFaceVerification
            ? "pending — the next step, and it can be completed later from any signed-in device."
            : "not required for this account type."}
        </p>
      </div>

      <Separator />

      <Group title="Basic Information" step="basic" onEdit={onEditStep}>
        <Row label="Full name" value={fullName} />
        <Row label="Gender / Date of birth" value={`${v.gender}, ${v.dob || "—"}`} />
        <Row label="Phone" value={v.phone} />
        <Row label="Branch" value={branch?.name ?? "—"} />
        <Row label="Loan type" value={name(lookups.loanTypes, v.loanTypeId)} />
        <Row label="Customer type" value={name(lookups.customerTypes, v.customerTypeId)} />
        <Row label="Account type" value={name(lookups.accountTypes, v.accountTypeId)} />
        <Row label="ID type" value={name(lookups.idTypes, v.idTypeId)} />
        <Row label="ID number" value={v.idNumber || "—"} />
      </Group>

      <Group title="Additional Details" step="personal" onEdit={onEditStep}>
        <Row label="Nickname" value={v.nickname || "—"} />
        <Row label="Marital status" value={name(lookups.maritalStatuses, v.maritalStatusId)} />
        {/* Only what this category actually asked for — the same three
            booleans the form showed the fields off. */}
        {category?.requiresSector && (
          <>
            <Row label="Sector" value={name(lookups.sectors, v.sectorId)} />
            <Row label="Sector category" value={name(lookups.sectorCategories, v.sectorCategoryId)} />
          </>
        )}
        {category?.requiresEmployer && (
          <Row label="Employer" value={name(lookups.employers, v.employerId)} />
        )}
        {category?.requiresContract && (
          <>
            <Row label="Contract type" value={name(lookups.contractTypes, v.contractTypeId)} />
            {v.contractExpiryDate && <Row label="Contract expiry" value={v.contractExpiryDate} />}
          </>
        )}
        {category?.requiresSalary && (
          <Row
            label="Take-home salary"
            value={v.takeHome === null || v.takeHome === undefined ? "—" : String(v.takeHome)}
          />
        )}
        <Row
          label="Documents attached"
          value={
            documents.length === 0
              ? "None"
              : `${documents.length} — ${documents.map((d) => d.name).join(", ")}`
          }
        />
        <Row label="Work type" value={v.workType || "—"} />
        <Row label="Type of employment" value={v.employmentType || "—"} />
        <Row label="Employer" value={v.employer || "—"} />
        <Row label="Place of employment" value={v.placeOfEmployment || "—"} />
        <Row label="Basic salary" value={money(v.basicSalary)} />
        <Row label="Take home" value={money(v.takeHome)} />
        <Row label="Monthly income" value={money(v.monthlyIncome)} />
        <Row label="Dependents" value={v.dependentsCount === null ? "—" : String(v.dependentsCount)} />
        <Row label="Category" value={category?.name ?? "—"} />
        <Row label="Guarantors" value={`${v.guarantors.length} recorded`} />
        <Row label="Next of kin" value={`${v.nextOfKin.length} recorded`} />
      </Group>

      <Group title="Identity & Documents" step="identity" onEdit={onEditStep}>
        {identityDocuments.length === 0 ? (
          <Row label="Documents" value="None captured" />
        ) : (
          identityDocuments.map(([label, value]) => (
            <Row key={String(label)} label={String(label)} value={String(value)} />
          ))
        )}
        <Row label="TIN" value={v.tinNumber || "—"} />
      </Group>

      <Group title="Bank & Account" step="bank" onEdit={onEditStep}>
        <Row label="Bank" value={name(lookups.banks, v.bankId)} />
        <Row label="Account number" value={v.bankDetails?.accountNumber || "—"} />
        <Row label="Account name" value={v.bankDetails?.accountName || "—"} />
        <Row label="Mobile money" value={v.mobileMoneyProvider || "—"} />
        <Row label="Wallet number" value={v.walletNumber || "—"} />
        <Row label="Card" value={v.cardNumber ? `•••• ${v.cardNumber.slice(-4)}` : "—"} />
      </Group>

      {category?.requiresExtraApproval && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          This category requires extra approval — the customer will be saved as &quot;Pending
          Approval&quot; and cannot take a loan until a supervisor approves them.
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- parts */

function Group({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: WizardStepId;
  onEdit: (step: WizardStepId) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(step)}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value || "—"}</dd>
    </div>
  );
}

function money(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toLocaleString();
}
