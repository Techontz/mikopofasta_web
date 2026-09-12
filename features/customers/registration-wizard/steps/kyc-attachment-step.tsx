"use client";

import * as React from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NO_AUTOFILL } from "@/features/customers/registration-wizard/no-autofill";

/** The one document code registration files against. See ReferenceDataSeeder. */
export const KYC_ATTACHMENT_CODE = "kyc_attachment";

export interface PendingDocument {
  code: string;
  file: File;
}

/**
 * Step 3 — KYC Attachments. One file, containing the customer's KYC pack.
 *
 * WHY ONE SLOT AND NOT A CHECKLIST. The previous screen drew a slot per
 * document type the customer type asked for — National ID, confirmation
 * letter, salary slip, bank card, employee ID — plus an "add another" form for
 * anything else. It described how the records are filed, not how the paper
 * arrives: a branch photographs or scans the customer's folder in one pass and
 * has a single PDF. Five slots for one file meant the officer either attached
 * the same scan five times or left four slots empty and the checklist unhappy.
 *
 * So registration takes the pack, and the document TYPES survive untouched for
 * anything filed individually afterwards from the customer's profile, where
 * the full picker still lives.
 *
 * NOTHING ELSE CHANGED UNDERNEATH. It is the same upload endpoint, the same
 * storage and the same `documentType` contract — the code is simply the one
 * that means "the pack" rather than one that names a single sheet.
 */
export function KycAttachmentStep({
  documents,
  onChange,
  error,
}: {
  documents: PendingDocument[];
  onChange: (next: PendingDocument[]) => void;
  /** Set when the officer tried to save without attaching anything. */
  error?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const attached = documents.find((d) => d.code === KYC_ATTACHMENT_CODE) ?? null;

  function attach(file: File | null) {
    /* Replaces rather than appends: there is one attachment, so choosing a
       second file means the first was the wrong one. */
    const rest = documents.filter((d) => d.code !== KYC_ATTACHMENT_CODE);
    onChange(file ? [...rest, { code: KYC_ATTACHMENT_CODE, file }] : rest);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="size-4 text-muted-foreground" aria-hidden />
          KYC Attachments
          <span className="text-destructive">*</span>
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Attach the customer&rsquo;s KYC documents as one file. Anything that needs to be filed
          separately can be added from their profile afterwards.
        </p>
      </div>

      <div className="sm:max-w-xl space-y-1">
        <Label htmlFor="kyc-attachment">KYC Attachment:</Label>

        {attached ? (
          /* What is attached, and a way to change it. A file input that has
             already been used shows its filename in a form nobody can style
             and no way to clear it. */
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{attached.file.name}</span>
            <span className="shrink-0 text-[12px] text-muted-foreground">
              {Math.max(1, Math.round(attached.file.size / 1024))} KB
            </span>
            <button
              type="button"
              onClick={() => {
                attach(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              aria-label="Remove the attachment"
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border px-2 py-1.5">
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              {...NO_AUTOFILL}
              ref={inputRef}
              id="kyc-attachment"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="border-0 p-0 shadow-none focus-visible:ring-0"
              onChange={(e) => attach(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        <p className="text-[12px] text-muted-foreground">PDF or image, up to 10 MB.</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
