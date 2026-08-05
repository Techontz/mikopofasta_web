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
}

type Values = Record<string, string | number | null>;

export function EditableSection({
  title,
  customerId,
  fields,
  values,
  canEdit,
  columns = 3,
}: {
  title: string;
  customerId: string;
  fields: EditableField[];
  /** Current values, straight off the customer resource. */
  values: Values;
  canEdit: boolean;
  columns?: 2 | 3;
}) {
  const [editing, setEditing] = React.useState(false);
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

  const changed = React.useMemo(() => {
    const out: Values = {};
    for (const f of fields) {
      const before = values[f.name] ?? null;
      const after = draft[f.name] ?? null;
      // "" from a cleared input means null to the API, not an empty string.
      const norm = (v: unknown) => (v === "" || v === undefined ? null : v);
      if (norm(before) !== norm(after)) out[f.name] = norm(after) as string | number | null;
    }
    return out;
  }, [draft, values, fields]);

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
        <div
          ref={formRef}
          className={columns === 2 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-3"}
        >
          {fields.map((field) => {
            const value = draft[field.name];
            const error = errors[field.name];

            return (
              <div key={field.name} data-field={field.name} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{field.label}</Label>

                {!editing ? (
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

/** An em dash for absent, the option's label for a select, the value otherwise. */
function formatted(value: unknown, field: EditableField): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  if (field.kind === "select") {
    return field.options?.find((o) => o.value === String(value))?.label ?? String(value);
  }
  if (field.kind === "number") return Number(value).toLocaleString();
  return String(value);
}
