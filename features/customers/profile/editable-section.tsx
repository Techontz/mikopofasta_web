"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import { updateCustomer } from "@/features/customers/actions";
import { isPresent } from "@/features/customers/profile/field-presence";

/**
 * One editable block of the customer profile.
 *
 * The profile used to be read-only, so everything captured at registration was
 * permanent — a surname typed wrongly on the day stayed wrong. Each section is
 * now independently editable, which matters because a profile has a dozen of
 * them and one big form would mean an officer correcting a phone number also
 * re-submits every other value, overwriting whatever a colleague changed while
 * they had the page open.
 *
 * ## Reading and editing show different things, on purpose
 *
 * Closed, a section shows ONLY the fields that hold an answer, and a section
 * holding no answers at all does not render — no card, no heading, no Edit
 * button, no row of em dashes. A customer record has around seventy optional
 * columns and a typical customer fills a dozen; printing the other sixty as
 * dashes is a database dump, not a profile.
 *
 * Open, it shows every field the section OFFERS — which is how a blank one
 * gets filled in. Offering is decided by the caller (`relevant`), because
 * whether an employer is worth asking for depends on the customer's type and
 * this component does not know the type. A field that already holds a value is
 * always both shown and offered, so hiding can never hide real data or make it
 * uneditable.
 *
 * Behaviour a banking form is expected to have, all of it here rather than
 * repeated per section:
 *
 *   - Save is disabled until something actually changes (dirty detection
 *     against the values the section opened with, not against empty).
 *   - Cancel restores those same values.
 *   - Leaving the page mid-edit warns, via beforeunload.
 *   - A field error from the API lands under its own input, and the first
 *     invalid field is scrolled to and focused.
 *   - Only changed keys are sent, so a section never posts a value it did not
 *     touch.
 */

export type FieldKind = "text" | "number" | "date" | "select";

export interface EditableField {
  /** The API's camelCase key. Sent as-is. */
  name: string;
  label: string;
  kind?: FieldKind;
  /** For `select` — usually a master-data list already loaded by the page. */
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** Rendered instead of the raw value when the section is closed. */
  display?: (value: unknown) => React.ReactNode;
  /**
   * Whether this field is worth ASKING this customer for. Default true.
   *
   * False means "do not offer it": a business-only question on a salaried
   * customer, a superseded column kept for records that still hold one. It
   * never hides an answer — a field with a value is shown and stays editable
   * whatever this says.
   */
  relevant?: boolean;
  /**
   * Shown when present, never turned into an input — for values this form
   * cannot legitimately write (a card's last four is derived from a number
   * nothing here holds).
   */
  readOnly?: boolean;
}

type Values = Record<string, string | number | null>;

export function EditableSection({
  title,
  customerId,
  fields,
  values,
  canEdit,
  columns = 3,
  autoEdit = false,
  onDismiss,
}: {
  title: string;
  customerId: string;
  fields: EditableField[];
  /** Current values, straight off the customer resource. */
  values: Values;
  canEdit: boolean;
  columns?: 2 | 3;
  /**
   * Mount already open. Set when the officer asked for a section that holds
   * nothing yet — there is no other way into it, because an empty section does
   * not render a card to click Edit on.
   */
  autoEdit?: boolean;
  /**
   * Cancelled out of a section that still holds nothing. The caller put this
   * section on screen and is the only one who can take it back off.
   */
  onDismiss?: () => void;
}) {
  const [editing, setEditing] = React.useState(autoEdit && canEdit);
  const [draft, setDraft] = React.useState<Values>(values);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const formRef = React.useRef<HTMLDivElement>(null);

  /*
   * The server is the source of truth. When a save succeeds the page
   * revalidates and new `values` arrive, so the draft follows them — and if
   * another section saved, this one picks that up too rather than holding a
   * stale copy.
   */
  const [seen, setSeen] = React.useState(values);
  if (seen !== values && !editing) {
    setSeen(values);
    setDraft(values);
  }

  /* What the record actually holds — the closed section, and the test for
     whether there is a section at all. */
  const answered = React.useMemo(
    () => fields.filter((f) => isPresent(values[f.name])),
    [fields, values]
  );

  /* What the open section asks for: everything relevant, plus anything
     already answered, so no existing value is ever left unreachable. */
  const offered = React.useMemo(
    () => fields.filter((f) => isPresent(values[f.name]) || (f.relevant ?? true)),
    [fields, values]
  );

  const changed = React.useMemo(() => {
    const out: Values = {};
    for (const f of offered) {
      if (f.readOnly) continue;
      const before = values[f.name] ?? null;
      const after = draft[f.name] ?? null;
      // "" from a cleared input means null to the API, not an empty string.
      const norm = (v: unknown) => (v === "" || v === undefined ? null : v);
      if (norm(before) !== norm(after)) out[f.name] = norm(after) as string | number | null;
    }
    return out;
  }, [draft, values, offered]);

  const isDirty = Object.keys(changed).length > 0;

  /* Losing an unsaved correction to a customer record is worth a browser
     prompt — this is the one place the native dialog is the right tool. */
  React.useEffect(() => {
    if (!editing || !isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing, isDirty]);

  function cancel() {
    if (isDirty && !window.confirm("Discard your unsaved changes to this section?")) return;
    setDraft(values);
    setErrors({});
    setEditing(false);
    /* Nothing was ever recorded here, so closing means the section goes away
       again rather than standing as an empty card. */
    if (answered.length === 0) onDismiss?.();
  }

  async function save() {
    setSaving(true);
    setErrors({});
    const result = await updateCustomer(customerId, changed);
    setSaving(false);

    if (result.ok) {
      toast.success(result.message ?? "Changes saved.");
      setEditing(false);
      return;
    }

    if (result.fieldErrors) {
      const mapped: Record<string, string> = {};
      for (const [key, messages] of Object.entries(result.fieldErrors)) {
        if (messages[0]) mapped[key] = messages[0];
      }
      setErrors(mapped);

      // Put the officer on the first thing that is actually wrong.
      const first = Object.keys(mapped)[0];
      setTimeout(() => {
        const el = formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"] input`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus({ preventScroll: true });
      }, 60);

      toast.error(Object.values(mapped)[0] ?? result.message);
      return;
    }

    toast.error(result.message ?? "Could not save.");
  }

  /* No answers and not being filled in: there is nothing to show and nothing
     to edit, so the card does not exist. */
  if (!editing && answered.length === 0) return null;

  const rendered = editing ? offered : answered;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {canEdit &&
          (editing ? (
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={cancel} disabled={saving}>
                <X className="size-3.5" />
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={save} disabled={!isDirty || saving}>
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                Save
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
          ))}
      </CardHeader>

      <CardContent>
        {/* Closed, a section of two answers gets two columns rather than three
            with a hole in it; open, the grid keeps the section's own width so
            the inputs stay where the officer expects them. */}
        <div ref={formRef} className={gridClass(editing ? columns : Math.min(columns, rendered.length))}>
          {rendered.map((field) => {
            const value = draft[field.name];
            const error = errors[field.name];
            const readingOnly = !editing || field.readOnly;

            return (
              <div key={field.name} data-field={field.name} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{field.label}</Label>

                {readingOnly ? (
                  <p className="min-h-[1.5rem] text-sm font-medium">
                    {field.display
                      ? field.display(values[field.name])
                      : formatted(values[field.name], field)}
                  </p>
                ) : field.kind === "select" ? (
                  <Combobox
                    value={value === null || value === undefined ? null : String(value)}
                    onChange={(v) => setDraft((d) => ({ ...d, [field.name]: v }))}
                    options={field.options ?? []}
                    placeholder={field.placeholder ?? "Select…"}
                    emptyMessage="Nothing configured for this list."
                    invalid={!!error}
                  />
                ) : (
                  <Input
                    type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"}
                    value={value === null || value === undefined ? "" : String(value)}
                    placeholder={field.placeholder}
                    aria-invalid={!!error}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        [field.name]:
                          field.kind === "number"
                            ? e.target.value === ""
                              ? null
                              : Number(e.target.value)
                            : e.target.value,
                      }))
                    }
                  />
                )}

                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/** Tailwind needs the class written out, so no template string here. */
function gridClass(columns: number): string {
  if (columns <= 1) return "grid gap-4";
  if (columns === 2) return "grid gap-4 sm:grid-cols-2";
  return "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
}

/** The option's label for a select, a grouped number, the value otherwise. */
function formatted(value: unknown, field: EditableField): React.ReactNode {
  /* Only reachable while a section is open — a closed one never renders a
     field without an answer. An open one does, and a blank read-only value
     still needs something to occupy its line. */
  if (!isPresent(value)) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (field.kind === "select") {
    return field.options?.find((o) => o.value === String(value))?.label ?? String(value);
  }
  if (field.kind === "number") return Number(value).toLocaleString();
  return String(value);
}
