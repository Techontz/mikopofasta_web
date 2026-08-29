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
 * EXTRA DOCUMENTS ARE STILL ALLOWED. The required slots are the floor, not the
 * ceiling; a branch that wants to attach something else can, and files it
 * under any active type.
 *
 * BLOCKING IS THE SERVER'S DECISION, not this component's. When
 * `requiresCategoryDocuments` is off — as it is everywhere today — the slots
 * are a checklist and the officer may continue with them empty. Nothing here
 * decides who may borrow.
 */
export function RequiredDocumentsStep({
  category,
  documentTypes,
  documents,
  onChange,
  blocking,
}: {
  category: CustomerCategory | undefined;
  documentTypes: MasterDataOption[];
  documents: PendingDocument[];
  onChange: (next: PendingDocument[]) => void;
  /** Whether the API will refuse KYC completion without these. */
  blocking: boolean;
}) {
  const required = category?.requiredDocuments ?? [];

  const nameFor = React.useCallback(
    (code: string) => documentTypes.find((d) => d.code === code)?.name ?? code,
    [documentTypes],
  );

  const fileFor = (code: string) => documents.find((d) => d.code === code)?.file;

  function attach(code: string, file: File | null) {
    const rest = documents.filter((d) => d.code !== code);
    onChange(file ? [...rest, { code, file }] : rest);
  }

  /* Anything attached that the category did not ask for. Kept separate so the
     required checklist stays a clean "n of m". */
  const extras = documents.filter((d) => !required.includes(d.code));
  const attachedCount = required.filter((code) => fileFor(code) !== undefined).length;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Required Documents</h2>
        <p className="text-sm text-muted-foreground">
          {category
            ? required.length === 0
              ? `A ${category.name} customer is not required to produce any documents.`
              : `A ${category.name} customer must produce ${required.length} document${required.length === 1 ? "" : "s"}.`
            : "Choose a customer category first — the category decides which documents are required."}
        </p>
      </div>

      {required.length > 0 && (
        <>
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              attachedCount === required.length
                ? "border-emerald-600/30 text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground",
            )}
          >
            {attachedCount === required.length ? (
              <CheckCircle2 className="size-4" aria-hidden />
            ) : (
              <CircleDashed className="size-4" aria-hidden />
            )}
            <span>
              <span className="font-medium">
                {attachedCount} of {required.length}
              </span>{" "}
              attached
              {!blocking && attachedCount < required.length && (
                /* Said plainly rather than implied. An officer who thinks a
                   checklist is a gate will stop and go looking for a file
                   nobody is asking them for yet. */
                <span className="text-muted-foreground">
                  {" "}
                  — you can continue and add the rest from the customer&apos;s profile.
                </span>
              )}
            </span>
          </div>

          <ul className="space-y-3">
            {required.map((code) => {
              const file = fileFor(code);

              return (
                <li key={code} className="rounded-lg border p-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="space-y-1.5">
                      <Label htmlFor={`doc-${code}`} className="flex items-center gap-2">
                        {file ? (
                          <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
                        ) : (
                          <CircleDashed className="size-4 text-muted-foreground" aria-hidden />
                        )}
                        {nameFor(code)}
                        {blocking && <span className="text-destructive"> *</span>}
                      </Label>
                      <div className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                        <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <Input
                          id={`doc-${code}`}
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          className="border-0 p-0 shadow-none focus-visible:ring-0"
                          onChange={(e) => attach(code, e.target.files?.[0] ?? null)}
                        />
                      </div>
                      {file && (
                        <p className="text-[11px] text-muted-foreground">
                          {file.name} · {Math.round(file.size / 1024)} KB
                        </p>
                      )}
                    </div>

                    {file && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => attach(code, null)}
                        aria-label={`Remove ${nameFor(code)}`}
                      >
                        <X className="size-4" aria-hidden />
                        Remove
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
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
