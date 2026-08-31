"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { Combobox } from "@/components/settings/combobox";
import { cn } from "@/lib/utils";
import {
  loadCadres,
  reloadList,
  removeCadre,
  removeEntry,
  saveCadre,
  saveEntry,
} from "@/features/admin/master-data/actions";
import type { MasterDataList, MasterDataOption } from "@/lib/api/master-data";

/**
 * Administration → Master Data.
 *
 * WHY ONE SCREEN AND NOT FOURTEEN. Every list here is the same five columns —
 * code, name, description, order, active — served by one controller against
 * one base model. Fourteen near-identical screens would drift, and the
 * thirteenth would be written six months after the twelfth by somebody who had
 * forgotten a detail of the first.
 *
 * WHAT THIS IS FOR. Nothing in this application ships an institution's
 * reference data. A fresh installation starts with every one of these lists
 * EMPTY, and registration says so and points here. This is where an
 * administrator states which banks they work with, which documents they
 * accept, which categories of customer they lend to — before the first
 * customer is registered.
 *
 * CODE IS IMMUTABLE AFTER CREATION, and the form says so rather than
 * silently allowing it. Stored data references the code — a category's
 * `required_documents` holds document-type codes, and the contract-expiry rule
 * keys on `TEMPORARY` — so renaming one would break references that no
 * foreign key protects. The NAME can be changed freely, including into
 * Swahili, which is what people actually read.
 *
 * DELETION IS THE EXCEPTION, deactivation the rule. An entry customers already
 * reference cannot be removed — the API refuses, the foreign keys are
 * `restrictOnDelete`, and a customer whose customer type vanished is a record
 * nobody can read. Turning it off keeps every existing record readable and
 * stops it being offered to anyone new.
 */

export interface ListDefinition {
  key: MasterDataList;
  label: string;
  description: string;
  /** Shown when the list is empty — what this list is FOR, in one line. */
  emptyHint: string;
  /**
   * A list this screen shows but does not edit, because it is not a flat
   * lookup — Customer Types carries a dynamic form schema, a document
   * list and eligibility rules, and needs its own editor. It stays in this
   * navigation so Master Data reads as one area rather than sending an
   * administrator hunting through the settings index for the half of the
   * reference data that lives elsewhere.
   */
  managedElsewhere?: { href: string; label: string };
}

export function MasterDataManager({
  definitions,
  initial,
  specialised,
}: {
  definitions: ListDefinition[];
  /** Every list, loaded on the server so the first paint is populated. */
  initial: Record<string, MasterDataOption[]>;
  /** Read-only summaries for the lists edited on their own screen. */
  specialised?: Record<string, SpecialisedRow[]>;
}) {
  const [active, setActive] = React.useState<MasterDataList>(definitions[0].key);
  const [rows, setRows] = React.useState<Record<string, MasterDataOption[]>>(initial);
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<MasterDataOption | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const definition = definitions.find((d) => d.key === active) ?? definitions[0];

  /* Memoised so the `??` does not produce a fresh array on every render and
     invalidate the filter below with it. */
  const all = React.useMemo(() => rows[active] ?? [], [rows, active]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }, [all, query]);

  async function refresh(list: MasterDataList) {
    const next = await reloadList(list);
    setRows((r) => ({ ...r, [list]: next }));
  }

  async function onSaved(result: { ok: boolean; message?: string }) {
    if (!result.ok) {
      toast.error(result.message ?? "Could not save.");
      return;
    }
    toast.success(result.message ?? "Saved.");
    setEditing(null);
    setCreating(false);
    await refresh(active);
  }

  async function toggleActive(row: MasterDataOption) {
    setPending(true);
    const result = await saveEntry(active, row.id, {
      code: row.code,
      name: row.name,
      description: row.description,
      sortOrder: row.sortOrder,
      isActive: !row.isActive,
    });
    setPending(false);

    if (!result.ok) {
      toast.error(result.message ?? "Could not change this entry.");
      return;
    }

    toast.success(`${row.name} ${row.isActive ? "deactivated" : "activated"}.`);
    await refresh(active);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {/* ------------------------------------------------------- the lists */}
      <nav className="space-y-1" aria-label="Master data lists">
        {definitions.map((d) => {
          const count = d.managedElsewhere
            ? (specialised?.[d.key] ?? []).length
            : (rows[d.key] ?? []).length;
          const isActive = d.key === active;

          return (
            <button
              key={d.key}
              type="button"
              onClick={() => {
                setActive(d.key);
                setQuery("");
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm",
                isActive ? "bg-muted font-medium" : "hover:bg-muted/60",
              )}
            >
              <span className="truncate">{d.label}</span>
              <span className="flex items-center gap-1">
                {/* Zero is the state an administrator most needs to see. */}
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    count === 0 ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground",
                  )}
                >
                  {count}
                </span>
                {isActive && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ------------------------------------------------------ the table */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{definition.label}</h2>
          <p className="text-sm text-muted-foreground">{definition.description}</p>
        </div>

        <div className={cn("flex flex-wrap items-center gap-2", definition.managedElsewhere && "hidden")}>
          <div className="relative min-w-56 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${definition.label.toLowerCase()}`}
              aria-label={`Search ${definition.label}`}
              className="pl-8"
            />
          </div>
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </div>

        {definition.managedElsewhere ? (
          <SpecialisedList definition={definition} rows={specialised?.[definition.key] ?? []} />
        ) : all.length === 0 ? (
          <div className="space-y-2 rounded-lg border border-dashed p-6 text-center">
            <p className="flex items-center justify-center gap-2 text-sm font-medium">
              <AlertTriangle className="size-4 text-amber-600" aria-hidden />
              No {definition.label.toLowerCase()} configured
            </p>
            <p className="mx-auto max-w-md text-xs text-muted-foreground">{definition.emptyHint}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden />
              Add the first one
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nothing matches “{query}”.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {filtered.map((row) => (
              <li key={row.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{row.name}</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {row.code}
                    </code>
                    {!row.isActive && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </p>
                  {row.description && (
                    <p className="truncate text-xs text-muted-foreground">{row.description}</p>
                  )}
                </div>

                <span className="hidden w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:inline">
                  {row.sortOrder ?? "—"}
                </span>

                <Switch
                  checked={row.isActive}
                  disabled={pending}
                  onCheckedChange={() => void toggleActive(row)}
                  aria-label={`${row.isActive ? "Deactivate" : "Activate"} ${row.name}`}
                />

                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(row)}>
                  <Pencil className="size-4" aria-hidden />
                  <span className="sr-only">Edit {row.name}</span>
                </Button>

                <ConfirmDeleteDialog
                  title={`Remove ${row.name}?`}
                  description="Entries already referenced by a customer or a loan cannot be removed — deactivate them instead, which keeps existing records readable."
                  successMessage={`${row.name} removed.`}
                  trigger={
                    <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="size-4" aria-hidden />
                      <span className="sr-only">Remove {row.name}</span>
                    </Button>
                  }
                  onConfirm={async () => {
                    const result = await removeEntry(active, row.id, row.name);
                    if (result.ok) await refresh(active);

                    return result;
                  }}
                />
              </li>
            ))}
          </ul>
        )}

        {/* Cadres hang off a sector, so they are managed inside it. */}
        {active === "sectors" && all.length > 0 && <SectorCadres sectors={all} />}
      </div>

      <EntryDialog
        key={`${active}-${editing?.id ?? "new"}-${creating}`}
        open={creating || editing !== null}
        entry={editing}
        listLabel={definition.label}
        /* Only ID Types carry a link to a document. The choices come from the
           Document Types list on this same screen, so an administrator never
           has to leave to find out what is on offer. */
        documentTypes={active === "id-types" ? (rows["document-types"] ?? []) : undefined}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={async (input) => onSaved(await saveEntry(active, editing?.id ?? null, input))}
      />
    </div>
  );
}

/** One row of a list edited on its own screen. */
export interface SpecialisedRow {
  id: string;
  name: string;
  code: string;
  /** Short facts worth seeing without leaving this screen. */
  facts: string[];
}

/**
 * A list that belongs to Master Data but is edited elsewhere.
 *
 * Customer Types is the case this exists for. It is reference data in
 * every sense an administrator cares about — it decides which customers can be
 * registered and what they must produce — but it is not a flat code/name
 * lookup: it carries a dynamic form schema, a required-document list and
 * eligibility rules, and squeezing that into the generic dialog would produce
 * a worse editor than the one it already has.
 *
 * So it is shown here, with its rows and its count, and the edit button leads
 * to the screen built for it. What an administrator should not have to learn
 * is which half of the reference data lives where.
 */
function SpecialisedList({
  definition,
  rows,
}: {
  definition: ListDefinition;
  rows: SpecialisedRow[];
}) {
  const target = definition.managedElsewhere!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          Edited on its own screen — it carries a dynamic form, a document list and
          eligibility rules.
        </p>
        <Link href={target.href}>
          <Button type="button" size="sm" variant="outline">
            {target.label}
            <ExternalLink className="size-3.5" aria-hidden />
          </Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed p-6 text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-medium">
            <AlertTriangle className="size-4 text-amber-600" aria-hidden />
            No {definition.label.toLowerCase()} configured
          </p>
          <p className="mx-auto max-w-md text-xs text-muted-foreground">{definition.emptyHint}</p>
          <Link href={target.href}>
            <Button type="button" variant="outline" size="sm">
              <Plus className="size-4" aria-hidden />
              Add the first one
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{row.name}</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {row.code}
                  </code>
                </p>
                {row.facts.length > 0 && (
                  <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {row.facts.map((f) => (
                      <span key={f}>{f}</span>
                    ))}
                  </p>
                )}
              </div>
              <Link href={target.href}>
                <Button type="button" variant="ghost" size="sm">
                  <Pencil className="size-4" aria-hidden />
                  <span className="sr-only">Edit {row.name}</span>
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- cadres --- */

/**
 * Sector → cadre, managed where the sector is.
 *
 * A sector with no cadres is unusable: registration asks for both levels and
 * refuses a cadre belonging to another sector, so creating TAMISEMI without
 * Teachers inside it produces a dropdown that dead-ends.
 */
function SectorCadres({ sectors }: { sectors: MasterDataOption[] }) {
  const [sectorId, setSectorId] = React.useState(sectors[0]?.id ?? "");
  const [cadres, setCadres] = React.useState<MasterDataOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<MasterDataOption | null>(null);

  const refresh = React.useCallback(async (id: string) => {
    if (!id) return;
    setCadres(await loadCadres(id));
    setLoading(false);
  }, []);

  /* The fetch is started from inside the async callback, never synchronously
     in the effect body — a setState there cascades a second render on every
     sector change. */
  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      const rows = await loadCadres(sectorId);
      if (!cancelled) {
        setCadres(rows);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sectorId]);

  const sector = sectors.find((s) => s.id === sectorId);

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Categories within a sector</h3>
          <p className="text-xs text-muted-foreground">
            The second level a public-servant registration asks for — the cadre inside the
            employing body.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)} disabled={!sectorId}>
          <Plus className="size-4" aria-hidden />
          Add category
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cadre-sector">Sector</Label>
        <select
          id="cadre-sector"
          value={sectorId}
          onChange={(e) => setSectorId(e.target.value)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : cadres.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
          {sector?.name} has no categories yet. Registration cannot complete for a customer in this
          sector until at least one exists.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {cadres.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-2.5">
              <span className="min-w-0 flex-1 truncate text-sm">
                {c.name}{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {c.code}
                </code>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(c)}>
                <Pencil className="size-4" aria-hidden />
                <span className="sr-only">Edit {c.name}</span>
              </Button>
              <ConfirmDeleteDialog
                title={`Remove ${c.name}?`}
                description="Refused while customers are filed under it — deactivate it instead."
                successMessage={`${c.name} removed.`}
                trigger={
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="size-4" aria-hidden />
                    <span className="sr-only">Remove {c.name}</span>
                  </Button>
                }
                onConfirm={async () => {
                  const result = await removeCadre(c.id, c.name);
                  if (result.ok) await refresh(sectorId);

                  return result;
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <EntryDialog
        key={`${sectorId}-${editing?.id ?? "new"}-${creating}`}
        open={creating || editing !== null}
        entry={editing}
        listLabel={`category in ${sector?.name ?? "this sector"}`}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={async (input) => {
          const result = await saveCadre(sectorId, editing?.id ?? null, input);
          if (!result.ok) {
            toast.error(result.message ?? "Could not save.");
            return;
          }
          toast.success(result.message);
          setCreating(false);
          setEditing(null);
          await refresh(sectorId);
        }}
      />
    </section>
  );
}

/* -------------------------------------------------------------- dialog --- */

function EntryDialog({
  open,
  entry,
  listLabel,
  documentTypes,
  onClose,
  onSubmit,
}: {
  open: boolean;
  entry: MasterDataOption | null;
  listLabel: string;
  /**
   * Given only for ID Types, and its presence is what makes the extra control
   * appear. Passing the choices rather than a flag keeps the branch to one
   * question — "is there a document list to offer?" — instead of this dialog
   * having to know which list it is editing.
   */
  documentTypes?: MasterDataOption[];
  onClose: () => void;
  onSubmit: (input: {
    code: string;
    name: string;
    description: string | null;
    sortOrder: number | null;
    isActive: boolean;
    documentTypeId?: string | null;
  }) => Promise<void>;
}) {
  /*
   * Initialised from the entry once. The parent gives this component a `key`
   * that changes with the entry, so React remounts it and the state resets —
   * which is the same effect as syncing props into state, without the
   * render-phase write that costs a second render and reads a ref while
   * rendering.
   */
  const [code, setCode] = React.useState(entry?.code ?? "");
  const [name, setName] = React.useState(entry?.name ?? "");
  const [description, setDescription] = React.useState(entry?.description ?? "");
  const [sortOrder, setSortOrder] = React.useState(
    entry?.sortOrder === null || entry?.sortOrder === undefined ? "" : String(entry.sortOrder),
  );
  const [isActive, setIsActive] = React.useState(entry?.isActive ?? true);
  const [documentTypeId, setDocumentTypeId] = React.useState(entry?.documentTypeId ?? "");
  const [pending, setPending] = React.useState(false);

  async function submit() {
    setPending(true);
    await onSubmit({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim() === "" ? null : description.trim(),
      sortOrder: sortOrder.trim() === "" ? null : Number(sortOrder),
      isActive,
      ...(documentTypes ? { documentTypeId: documentTypeId || null } : {}),
    });
    setPending(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {entry ? `Edit ${entry.name}` : `Add ${listLabel.toLowerCase().replace(/s$/, "")}`}
          </DialogTitle>
          <DialogDescription>
            The name is what people read and can be changed at any time, including into Swahili.
            The code is what stored records point at.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="md-code">Code</Label>
              <Input
                id="md-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={entry !== null}
                className="font-mono uppercase"
                placeholder="SHORT_CODE"
              />
              {entry !== null && (
                /* Said, not silently enforced: stored data references the code
                   and no foreign key protects a rename. */
                <p className="text-[11px] text-muted-foreground">
                  Fixed after creation — existing records reference it.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="md-name">Name</Label>
              <Input id="md-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="md-description">Description</Label>
            <Textarea
              id="md-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional. Shown as a hint beside the option."
            />
          </div>

          {documentTypes && (
            <div className="space-y-1.5">
              <Label htmlFor="md-document-type">Document that proves it</Label>
              <Combobox
                id="md-document-type"
                value={documentTypeId || null}
                onChange={(v) => setDocumentTypeId(v ?? "")}
                options={documentTypes.map((d) => ({ value: d.id, label: d.name }))}
                placeholder="No document is collected"
                emptyMessage="No document types are configured yet. Add them under Document Types on this page."
              />
              {/* The reason this control exists, said plainly — otherwise it
                  reads as one more optional box. */}
              <p className="text-[11px] text-muted-foreground">
                When an officer picks this ID type during registration, the documents step asks them
                to upload this document. Leave it empty if you take no copy.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="md-order">Display order</Label>
              <Input
                id="md-order"
                type="number"
                inputMode="numeric"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="Lower shows first"
              />
            </div>
            <div className="flex items-end gap-2 pb-1.5">
              <Switch id="md-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="md-active">Offered on forms</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            <X className="size-4" aria-hidden />
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending || !code.trim() || !name.trim()}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
            {entry ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
