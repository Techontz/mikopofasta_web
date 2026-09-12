"use client";

import * as React from "react";
import { CheckCircle2, CircleDashed, FileText, Paperclip, Plus, X } from "lucide-react";
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

/** A slot in the checklist: what is wanted, why, and whether it is a condition. */
interface Slot {
  code: string;
  label: string;
  /** Why this document is being asked for, when that is not obvious. */
  note?: string;
  /** A condition of registration, rather than something the branch would like. */
  required: boolean;
  /** Not asked for by anything — attached by the officer on top of the list. */
  extra?: boolean;
}

/**
 * Step 3 — KYC Documents. ONE list, and everything the customer has to produce
 * is on it.
 *
 * WHAT WAS HERE BEFORE, AND WHY IT WAS WRONG. The same files were split across
 * four separate blocks with four headings: the identity document on its own,
 * then "Required Documents" with its own count, then a sentence introducing the
 * optional ones, then a bordered "Add another document" panel, then a fifth
 * list of whatever had been attached through it. Five renderings of one idea —
 * "documents this customer's file needs" — and the officer had to hold all five
 * in their head to answer "am I done?". The identity document in particular sat
 * outside the count that claimed to say.
 *
 * IT IS NOW ONE CHECKLIST, in the order the officer works through it: the
 * identity document, then everything the customer type asks for, then anything
 * it merely accepts, then anything the branch has added. Each row says for
 * itself whether it is required, and the counter at the top counts exactly the
 * rows marked required — including the identity document, which is the one that
 * decides whether a customer is created at all.
 *
 * NOTHING HERE NAMES A DOCUMENT. Two different questions decide what the list
 * holds, and both are answered by data. The ID TYPE chosen on step one decides
 * which document proves the customer's identity — the link is on the ID type
 * itself, set in Administration, so choosing Passport asks for a passport. The
 * CUSTOMER TYPE decides everything else, through `requiredDocuments` and
 * `optionalDocuments`, which hold document-type CODES; the names beside them
 * come from the admin-managed `document-types` list.
 *
 * A CODE WITH NO MATCHING TYPE STILL GETS A ROW, labelled with the code made
 * readable. Silently dropping it would show four rows where the customer type
 * asks for five and give the officer no way to know.
 *
 * WHEN TWO SOURCES ASK FOR THE SAME FILE, IT IS ASKED FOR ONCE. A customer type
 * whose list already includes the national ID, registered by somebody who
 * showed a national ID, produced two identical upload boxes with no way to tell
 * them apart. The identity row wins — it is the more specific requirement and
 * it says why the document is wanted.
 *
 * BLOCKING IS THE SERVER'S DECISION, not this component's. When
 * `requiresCategoryDocuments` is off — as it is everywhere today — the customer
 * type's list is a checklist and the officer may continue with it incomplete.
 * The identity document is the exception, and the Save button, not this
 * component, is what refuses.
 */
export function KycDocumentsStep({
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
   * Shown under the identity row after a Save was refused for the want of it.
   * Held by the wizard rather than derived here, because "is it missing" and
   * "has the officer been told" are different questions — an empty slot on a
   * form nobody has submitted yet is not an error.
   */
  identityError?: string;
  documentTypes: MasterDataOption[];
  documents: PendingDocument[];
  onChange: (next: PendingDocument[]) => void;
  /** Whether the API will refuse KYC completion without the category's list. */
  blocking: boolean;
}) {
  /**
   * The document's name, never its code.
   *
   * A code that matches nothing is a misconfiguration — a customer type asking
   * for a document type somebody deleted — and it still gets a row, because
   * silently dropping it would show four boxes where the type asks for five.
   * But it is shown as readable words rather than as `EMP_CONFIRM_01`, which
   * tells a branch officer nothing they can act on.
   */
  const nameFor = React.useCallback(
    (code: string) => documentTypes.find((d) => d.code === code)?.name ?? humanise(code),
    [documentTypes]
  );

  /**
   * The whole checklist, in one list, in the order it is worked through.
   *
   * Assembled here rather than rendered from three separate arrays, because
   * "how many of these are required and how many have I attached" has to be one
   * answer — and it was three.
   */
  const slots = React.useMemo<Slot[]>(() => {
    const seen = new Set<string>();
    const rows: Slot[] = [];

    if (identity) {
      seen.add(identity.code);
      rows.push({
        code: identity.code,
        label: identity.name,
        /* Says WHY this one is being asked for, which is the only thing that
           distinguishes it from the rest of the list. */
        note: `Identity document — the customer's ${identity.idTypeName}.`,
        /* ALWAYS required, and not subject to the switch that governs the
           customer type's list: the institution has said which document
           evidences this identity type by linking the two in Administration,
           and Save refuses until it is attached. */
        required: true,
      });
    }

    for (const code of category?.requiredDocuments ?? []) {
      if (seen.has(code)) continue;
      seen.add(code);
      rows.push({ code, label: nameFor(code), required: blocking });
    }

    for (const code of category?.optionalDocuments ?? []) {
      if (seen.has(code)) continue;
      seen.add(code);
      rows.push({ code, label: nameFor(code), required: false });
    }

    /* Anything the officer attached that nothing asked for. The floor is not
       the ceiling. */
    for (const doc of documents) {
      if (seen.has(doc.code)) continue;
      seen.add(doc.code);
      rows.push({ code: doc.code, label: nameFor(doc.code), required: false, extra: true });
    }

    return rows;
  }, [identity, category, documents, blocking, nameFor]);

  const fileFor = (code: string) => documents.find((d) => d.code === code)?.file;

  function attach(code: string, file: File | null) {
    const rest = documents.filter((d) => d.code !== code);
    onChange(file ? [...rest, { code, file }] : rest);
  }

  const mandatory = slots.filter((s) => s.required);
  const attached = mandatory.filter((s) => fileFor(s.code) !== undefined).length;
  const complete = mandatory.length > 0 && attached === mandatory.length;

  /* Which document types are still unclaimed, for the "add another" row. A list
     that offered a type already on the checklist would give the officer two
     boxes for one document. */
  const unclaimed = documentTypes.filter((d) => !slots.some((s) => s.code === d.code));

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">KYC Documents</h2>
        <p className="text-sm text-muted-foreground">
          {category
            ? `Everything a ${category.name} customer's file needs, in one list.`
            : "Choose a customer type on Basic Information — it decides which documents are required."}
        </p>
      </div>

      {mandatory.length > 0 && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
            complete
              ? "border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
              : "text-muted-foreground"
          )}
        >
          {complete ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <CircleDashed className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <span>
            <span className="font-medium text-foreground">
              {attached} of {mandatory.length}
            </span>{" "}
            required document{mandatory.length === 1 ? "" : "s"} attached
            {/* Said plainly rather than implied. An officer who takes a
                checklist for a gate will stop and go looking for a file nobody
                is asking them for yet. */}
            {!complete &&
              (identity && fileFor(identity.code) === undefined
                ? ` — the ${identity.name} must be attached before saving. The rest can be added from the customer's profile.`
                : blocking
                  ? " — all of these are required before this customer's KYC is complete."
                  : " — you can save now and add the rest from the customer's profile.")}
          </span>
        </div>
      )}

      <ul className="space-y-3">
        {slots.map((slot) => (
          <DocumentSlot
            key={slot.code}
            slot={slot}
            error={identity?.code === slot.code ? identityError : undefined}
            file={fileFor(slot.code)}
            onAttach={(f) => attach(slot.code, f)}
          />
        ))}

        {/* In the same list, as its last row: adding a document is the same act
            as filling a slot, and the bordered panel it used to live in read as
            a different feature. */}
        <ExtraDocument documentTypes={unclaimed} onAdd={(d) => onChange([...documents, d])} />
      </ul>
    </div>
  );
}

/**
 * One row of the checklist — what is wanted, whether it is a condition, a file
 * picker, and a way to take it back.
 *
 * Required and optional render through the same component because they ARE the
 * same thing to the officer filling them in; the only difference is the badge
 * and what happens if it is left empty.
 */
function DocumentSlot({
  slot,
  error,
  file,
  onAttach,
}: {
  slot: Slot;
  error?: string;
  file: File | undefined;
  onAttach: (file: File | null) => void;
}) {
  return (
    /* The wizard's error focusing scrolls to this, using the same key it
       reports the failure under. */
    <li className="rounded-lg border p-3" data-field={`documents.${slot.code}`}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor={`doc-${slot.code}`} className="flex flex-wrap items-center gap-2">
            {file ? (
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
            ) : (
              <CircleDashed className="size-4 text-muted-foreground" aria-hidden />
            )}
            <span>{slot.label}</span>
            <Badge kind={slot.required ? "required" : slot.extra ? "added" : "optional"} />
          </Label>
          {slot.note && <p className="text-[12px] text-muted-foreground">{slot.note}</p>}
          <div className="flex items-center gap-2 rounded-md border px-2 py-1.5">
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              id={`doc-${slot.code}`}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="border-0 p-0 shadow-none focus-visible:ring-0"
              onChange={(e) => onAttach(e.target.files?.[0] ?? null)}
            />
          </div>
          {file && (
            <p className="text-[12px] text-muted-foreground">
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
            aria-label={`Remove ${slot.label}`}
          >
            <X className="size-4" aria-hidden />
            Remove
          </Button>
        )}
      </div>
    </li>
  );
}

/** Required / Optional / Added, in words rather than as a lone asterisk. */
function Badge({ kind }: { kind: "required" | "optional" | "added" }) {
  const text = kind === "required" ? "Required" : kind === "optional" ? "Optional" : "Added";

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        kind === "required"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground"
      )}
    >
      {text}
    </span>
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

/** One more document, of whatever type — the last row of the same checklist. */
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
    <li className="rounded-lg border border-dashed p-3">
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Plus className="size-4" aria-hidden />
          Add another document
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="extraDocumentType">Document type</Label>
            <Combobox
              id="extraDocumentType"
              value={code || null}
              onChange={(v) => setCode(v ?? "")}
              options={documentTypes.map((d) => ({ value: d.code, label: d.name }))}
              placeholder="Select document type"
              emptyMessage="Every configured document type is already on the list above."
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
      </div>
    </li>
  );
}
