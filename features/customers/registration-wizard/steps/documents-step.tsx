"use client";

import { BadgeCheck, ShieldCheck } from "lucide-react";
import { RequiredDocumentsStep, type PendingDocument } from "@/features/customers/registration-wizard/steps/required-documents-step";
import type { MasterDataOption } from "@/types/master-data";
import type { CustomerCategory } from "@/types/customer";

/**
 * Step 3 — Documents. The last step before the customer exists.
 *
 * WHAT THIS STEP IS FOR, said on the step. Pressing Save here writes a
 * permanent record and hands back a customer number; it does NOT finish the
 * registration. The officer needs to know both halves of that before they press
 * it, because the difference decides whether they can walk away — and they can.
 *
 * WHICH DOCUMENTS APPEAR HAS TWO ANSWERS, AND THEY ARE DIFFERENT QUESTIONS. The
 * ID TYPE chosen on step one decides which document proves the customer's
 * identity — the link is on the ID type itself, set in Administration — and the
 * CUSTOMER TYPE decides everything else its configuration asks for. Nothing
 * here names a document.
 *
 * FACE VERIFICATION IS NOT HERE ANY MORE. It is step four, against the customer
 * this step creates. Combining them made a save and a biometric scan look like
 * one action, when the officer may legitimately stop between them for a day.
 */
export function DocumentsStep({
  category,
  identity,
  identityError,
  documentTypes,
  documents,
  onDocumentsChange,
  blocking,
  savedCustomer,
}: {
  category: CustomerCategory | undefined;
  identity: { code: string; name: string; idTypeName: string } | null;
  identityError?: string;
  documentTypes: MasterDataOption[];
  documents: PendingDocument[];
  onDocumentsChange: (next: PendingDocument[]) => void;
  blocking: boolean;
  /** Set once this step's save has run. The record exists from then on. */
  savedCustomer: { id: string; name: string; customerNumber: string | null } | null;
}) {
  return (
    <div className="space-y-6">
      {savedCustomer ? (
        /* Returning to a step that has already run. Saying so plainly is what
           stops an officer pressing Save a second time looking for a
           confirmation they already had. */
        <div className="flex items-start gap-3 rounded-lg border border-emerald-600/30 bg-emerald-500/10 p-4 text-sm">
          <BadgeCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium">
              {savedCustomer.name} is saved
              {savedCustomer.customerNumber ? ` as ${savedCustomer.customerNumber}` : ""}.
            </p>
            <p className="text-muted-foreground">
              Their registration is awaiting face verification. Continue to the last step to complete
              it now, or leave — the customer is in the book and the scan can be run later from their
              profile.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Saving here creates the customer and files these documents against them. It does not
            finish the registration — face verification is the last step, and it can be done now or
            later.
          </span>
        </div>
      )}

      <RequiredDocumentsStep
        category={category}
        identity={identity}
        identityError={identityError}
        documentTypes={documentTypes}
        documents={documents}
        onChange={onDocumentsChange}
        blocking={blocking}
      />
    </div>
  );
}
