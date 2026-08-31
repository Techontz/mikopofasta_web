"use client";

import * as React from "react";
import { CheckCircle2, CircleDashed, FileText, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import { cn } from "@/lib/utils";
import type { MasterDataOption } from "@/lib/api/master-data";
import type { CustomerCategory } from "@/types/customer";

/** One chosen file, and the document code it will be filed under. */
export interface PendingDocument {
  code: string;
  file: File;
}

/**
 * The documents this customer's CATEGORY requires, one slot each.
 *
 * WHAT WAS HERE BEFORE. One optional file and one type dropdown. A public
 * servant is required to produce five documents — a confirmation letter, a
 * payslip, a bank card, an employee ID and a national ID — and the form had
 * room for one of them, labelled "Optional". The other four had nowhere to go,
 * so the requirement was unmeetable by construction.
 *
 * THE LIST IS THE CATEGORY'S. `category.requiredDocuments` holds document-type
 * CODES, and the names shown beside them come from the admin-managed
 * `document-types` list. Neither is written here: a category configured
 * tomorrow gets its own slots with no deployment, and this file could not name
 * a document if it wanted to.
 *
 * A CODE WITH NO MATCHING TYPE STILL GETS A SLOT, labelled with the raw code.
 * Silently dropping it would hide a misconfiguration behind a shorter list —
 * the officer would see four slots where the category asks for five and have
 * no way to know.
 *
 * THE IDENTITY DOCUMENT IS THE FIRST SLOT, AND IT IS NOT THE CATEGORY'S.
 * Two different questions decide what this step asks for. The ID TYPE chosen on
 * step one decides which document proves who the customer is — the link is on
 * the ID type itself, set in Administration, so choosing Passport asks for a
 * passport and choosing Voter ID asks for a voter card, and this file could not
 * name either of them if it wanted to. The CUSTOMER TYPE decides everything
 * else: a payslip, a confirmation letter, a bank card.
 *
 * WHEN BOTH ASK FOR THE SAME FILE, IT IS ASKED FOR ONCE. A customer type whose
 * document list already includes the national ID, registered by somebody who
 * showed a national ID, produced two identical upload boxes with no way to tell
 * them apart. The identity slot wins — it is the more specific requirement, and
 * it says why the document is wanted — and the category's copy is dropped.
 *
 * OPTIONAL SLOTS SIT BELOW THE REQUIRED ONES. A customer type may name
 * documents it would LIKE on file without making them a condition of
 * registration — `optionalDocuments` beside `requiredDocuments`. Two lists
 * rather than one list of objects with a flag, because "required" is what
 * `requiredDocuments` has always meant to KycEvaluator and to this component,
 * and widening it would have changed a contract three readers depend on in
 * order to express one boolean.
 *
 * EXTRA DOCUMENTS ARE STILL ALLOWED. The configured slots are the floor, not
 * the ceiling; a branch that wants to attach something else can, and files it
 * under any active type.
 *
 * BLOCKING IS THE SERVER'S DECISION, not this component's. When
 * `requiresCategoryDocuments` is off — as it is everywhere today — the slots
 * are a checklist and the officer may continue with them empty. Nothing here
 * decides who may borrow.
 */
export function RequiredDocumentsStep({
  category,
  identity,
  identityError,
  documentTypes,
  documents,
  onChange,
  blocking,
}: {
  category: CustomerCategory | undefined;
  /**
   * The document that evidences the ID type chosen on step one, resolved from
   * the link an administrator set on that ID type. Null when no ID type is
   * chosen, or when the institution takes no copy of the one that was.
   */
  identity: { code: string; name: string; idTypeName: string } | null;
  /**
   * Shown under the identity slot after a Save was refused for the want of it.
   * Held by the wizard rather than derived here, because "is it missing" and
   * "has the officer been told" are different questions — an empty slot on a
   * form nobody has submitted yet is not an error.
   */
  identityError?: string;
  documentTypes: MasterDataOption[];
  documents: PendingDocument[];
  onChange: (next: PendingDocument[]) => void;
  /** Whether the API will refuse KYC completion without these. */
  blocking: boolean;
}) {
  /* The category's list, minus anything the identity slot above already asks
     for — see the note at the top of this file. */
  const required = (category?.requiredDocuments ?? []).filter((code) => code !== identity?.code);
  /* Offered, never demanded — and never duplicated: a code configured in both
     lists is a misconfiguration, and showing it twice would give the officer
     two slots for one document and no way to tell them apart. */
  const optional = (category?.optionalDocuments ?? []).filter(
    (code) => !required.includes(code) && code !== identity?.code,
  );

  /**
   * The document's name, never its code.
   *
   * A code that matches nothing is a misconfiguration — a customer type asking
   * for a document type somebody deleted — and it still gets a slot, because
   * silently dropping it would show four boxes where the type asks for five and
   * give the officer no way to know. But it is shown as readable words rather
   * than as `EMP_CONFIRM_01`, which tells a branch officer nothing they can act
   * on.
   */
  const nameFor = React.useCallback(
    (code: string) => documentTypes.find((d) => d.code === code)?.name ?? humanise(code),
    [documentTypes],
  );

  const fileFor = (code: string) => documents.find((d) => d.code === code)?.file;

  function attach(code: string, file: File | null) {
    const rest = documents.filter((d) => d.code !== code);
    onChange(file ? [...rest, { code, file }] : rest);
  }

  /* Anything attached that the category did not ask for. Kept separate so the
     required checklist stays a clean "n of m". */
  const extras = documents.filter(
    (d) => !required.includes(d.code) && !optional.includes(d.code) && d.code !== identity?.code,
  );

  /* The identity document counts toward "n of m", because it is one of the
     documents the officer has to produce and a checklist that left it out
     would say 4 of 4 while the registration was still refusing to save. */
  const mandatory = identity ? [identity.code, ...required] : required;
  const attachedCount = mandatory.filter((code) => fileFor(code) !== undefined).length;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Required Documents</h2>
        <p className="text-sm text-muted-foreground">
          {category
            ? required.length === 0
              ? identity
                ? `A ${category.name} customer produces no further documents beyond their ${identity.idTypeName}.`
                : `A ${category.name} customer is not required to produce any documents.`
              : `A ${category.name} customer must produce ${required.length} further document${required.length === 1 ? "" : "s"}.`
            : "Choose a customer type on the previous step — it decides which documents are required."}
        </p>
      </div>

      {identity && (
        <ul className="space-y-3">
          <DocumentSlot
            code={identity.code}
            label={identity.name}
            /* Says WHY this one is being asked for, which is the only thing
               that distinguishes it from the list below. */
            note={`Identity document — the customer's ${identity.idTypeName}.`}
            /*
             * ALWAYS REQUIRED, and not subject to the switch that governs the
             * category's list. The institution has said which document
             * evidences this identity type by linking the two in
             * Administration; a customer cannot be registered without a copy of
             * it, and the Save button refuses until it is attached.
             */
            required
            error={identityError}
            file={fileFor(identity.code)}
            onAttach={(f) => attach(identity.code, f)}
          />
        </ul>
      )}

      {mandatory.length > 0 && (
        <>
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              attachedCount === mandatory.length
                ? "border-emerald-600/30 text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground",
            )}
          >
            {attachedCount === mandatory.length ? (
              <CheckCircle2 className="size-4" aria-hidden />
            ) : (
              <CircleDashed className="size-4" aria-hidden />
            )}
            <span>
              <span className="font-medium">
                {attachedCount} of {mandatory.length}
              </span>{" "}
              attached
              {!blocking && attachedCount < mandatory.length && (
                /* Said plainly rather than implied. An officer who thinks a
                   checklist is a gate will stop and go looking for a file
                   nobody is asking them for yet. */
                <span className="text-muted-foreground">
                  {" "}
                  {identity && fileFor(identity.code) === undefined
                    ? ` — the ${identity.name} must be attached before saving; the rest can be added from the customer's profile.`
                    : " — you can continue and add the rest from the customer's profile."}
                </span>
              )}
            </span>
          </div>

          <ul className="space-y-3">
            {required.map((code) => (
              <DocumentSlot
                key={code}
                code={code}
                label={nameFor(code)}
                required={blocking}
                file={fileFor(code)}
                onAttach={(f) => attach(code, f)}
              />
            ))}
          </ul>
        </>
      )}

      {optional.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            Also accepted for a {category?.name} customer, if the customer has {optional.length === 1 ? "it" : "them"}:
          </p>
          <ul className="space-y-3">
            {optional.map((code) => (
              <DocumentSlot
                key={code}
                code={code}
                label={nameFor(code)}
                required={false}
                file={fileFor(code)}
                onAttach={(f) => attach(code, f)}
              />
            ))}
          </ul>
        </>
      )}

      {/* --------------------------------------------------- anything else */}
      <ExtraDocument documentTypes={documentTypes} onAdd={(d) => onChange([...documents, d])} />

      {extras.length > 0 && (
        <ul className="space-y-2">
          {extras.map((d, i) => (
            <li
              key={`${d.code}-${i}`}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                <span className="font-medium">{nameFor(d.code)}</span>
                <span className="text-muted-foreground">{d.file.name}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(documents.filter((x) => x !== d))}
                aria-label={`Remove ${d.file.name}`}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One document slot — a label, a file picker, and a way to take it back.
 *
 * The required and the optional lists render through the same component
 * because they ARE the same thing to the officer filling them in; the only
 * difference is the asterisk and what happens if it is left empty.
 */
function DocumentSlot({
  code,
  label,
  note,
  required,
  error,
  file,
  onAttach,
}: {
  code: string;
  label: string;
  /** Why this document is being asked for, when that is not obvious. */
  note?: string;
  required: boolean;
  error?: string;
  file: File | undefined;
  onAttach: (file: File | null) => void;
}) {
  return (
    /* The wizard's error focusing scrolls to this, using the same key it
       reports the failure under. */
    <li className="rounded-lg border p-3" data-field={`documents.${code}`}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor={`doc-${code}`} className="flex items-center gap-2">
            {file ? (
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
            ) : (
              <CircleDashed className="size-4 text-muted-foreground" aria-hidden />
            )}
            {label}
            {required && <span className="text-destructive"> *</span>}
          </Label>
          {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
          <div className="flex items-center gap-2 rounded-md border px-2 py-1.5">
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              id={`doc-${code}`}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="border-0 p-0 shadow-none focus-visible:ring-0"
              onChange={(e) => onAttach(e.target.files?.[0] ?? null)}
            />
          </div>
          {file && (
            <p className="text-[11px] text-muted-foreground">
              {file.name} · {Math.round(file.size / 1024)} KB
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {file && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAttach(null)}
            aria-label={`Remove ${label}`}
          >
            <X className="size-4" aria-hidden />
            Remove
          </Button>
        )}
      </div>
    </li>
  );
}

/** `employment_contract` → "Employment Contract". A last resort, never a label a well-configured system reaches. */
function humanise(code: string): string {
  return code
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** One more document, of whatever type — the floor is not the ceiling. */
function ExtraDocument({
  documentTypes,
  onAdd,
}: {
  documentTypes: MasterDataOption[];
  onAdd: (doc: PendingDocument) => void;
}) {
  const [code, setCode] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function add() {
    if (!code || !file) return;
    onAdd({ code, file });
    setCode("");
    setFile(null);
    /* Cleared through the DOM node: a file input's value cannot be reset by
       re-rendering, so without this the same file stays selected. */
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="space-y-3 rounded-lg border border-dashed p-4">
      <h3 className="text-sm font-medium">Add another document</h3>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label>Document type</Label>
          <Combobox
            id="extraDocumentType"
            value={code || null}
            onChange={(v) => setCode(v ?? "")}
            options={documentTypes.map((d) => ({ value: d.code, label: d.name }))}
            placeholder="Select document type"
            emptyMessage="No document types are configured. Add them under Administration → Master Data."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="extraDocumentFile">File (PDF or image, max 10 MB)</Label>
          <div className="flex items-center gap-2 rounded-md border px-2 py-1.5">
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              ref={inputRef}
              id="extraDocumentFile"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="border-0 p-0 shadow-none focus-visible:ring-0"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <Button type="button" variant="outline" onClick={add} disabled={!code || !file}>
          <Paperclip className="size-4" aria-hidden />
          Attach
        </Button>
      </div>
      {file && !code && (
        <p className="text-xs text-destructive">Choose a document type, or the file cannot be filed.</p>
      )}
    </section>
  );
}
