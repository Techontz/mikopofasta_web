"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox, type ComboboxOption } from "@/components/settings/combobox";
import { loadSectorCategories } from "@/features/customers/geography-actions";
import { isFieldRequired, type Lookups } from "@/features/customers/registration-wizard/dynamic-form";
import { toRecord } from "@/features/customers/registration-wizard/wizard-schema";
import {
  errorPathFor,
  isNumericTarget,
  structuredNameFor,
} from "@/features/customers/registration-wizard/structured-fields";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import {
  DYNAMIC_DATA_SOURCE_ORIGIN,
  PARENTED_DATA_SOURCES,
  type DynamicFormField,
} from "@/types/customer";

/**
 * The field engine. One component, and it renders whatever the customer type
 * says — nothing in this file knows the name of a single customer type,
 * sector, cadre or contract.
 *
 * This is the whole architecture in one place, so it is worth being explicit
 * about what it does NOT do. There is no `if (customerType === "WATUMISHI")`,
 * no per-type component, and no list of codes it recognises. A customer type
 * created this afternoon renders correctly this afternoon, and adding a
 * question to an existing one is a save on an administration screen.
 *
 * FIVE THINGS COME FROM THE CONFIGURATION, and every one of them used to be
 * written into a component:
 *
 *   WHAT IS ASKED         the field list, in the administrator's order
 *   HOW IT IS ASKED       text, number, currency, date, select, long text, yes/no
 *   WHAT MAY BE ANSWERED  fixed choices, or an admin-managed list read live
 *   WHAT DEPENDS ON WHAT  a list filtered by another field's answer
 *   WHAT IS MANDATORY     always, or only when another answer says so
 *
 * WHERE THE ANSWER GOES is decided by the field's key alone — see
 * structured-fields.ts. A key naming a real customer column binds straight to
 * that column, so it stays searchable and reportable; every other key goes into
 * `dynamicFormData`. The officer cannot tell the difference and should not have
 * to.
 */
export function DynamicFields({ fields, lookups }: { fields: DynamicFormField[]; lookups: Lookups }) {
  const { watch, setValue, formState } = useFormContext<WizardValues>();

  /* Normalised on the way in, not trusted. A resumed draft can hand this back
     as an array — see toRecord — and every read and write below assumes a
     record. */
  const dynamicFormData = toRecord(watch("dynamicFormData"));
  const values = watch();

  /** One field's current answer, wherever it happens to be stored. */
  const read = React.useCallback(
    (field: DynamicFormField): unknown => {
      const name = structuredNameFor(field);
      return name === null ? dynamicFormData[field.key] : values[name];
    },
    [dynamicFormData, values]
  );

  /**
   * Writes an answer, and clears anything that depended on it.
   *
   * The clearing is §24, and it is not optional: a cadre chosen under one
   * ministry is meaningless once the sector becomes another, and leaving it
   * would submit a value the API refuses — with the error landing on a field
   * that looks perfectly filled in.
   */
  const write = React.useCallback(
    (field: DynamicFormField, next: unknown) => {
      const dependants = fields.filter((f) => f.dependsOn === field.key);
      const name = structuredNameFor(field);

      /* One write to `dynamicFormData`, not one per field: two setValue calls
         against the same object both read the same stale copy, and the second
         would discard the first. */
      /* Always a record: `dynamicFormData` is normalised above, so spreading it
         cannot reintroduce an array shape. */
      const json: Record<string, string | number | boolean> = { ...dynamicFormData };
      let jsonTouched = false;

      if (name === null) {
        json[field.key] = next as string;
        jsonTouched = true;
      } else {
        setValue(name, next as never, { shouldValidate: false });
      }

      for (const dependant of dependants) {
        const dependantName = structuredNameFor(dependant);
        if (dependantName === null) {
          json[dependant.key] = "";
          jsonTouched = true;
        } else {
          setValue(dependantName, null as never, { shouldValidate: false });
        }
      }

      if (jsonTouched) setValue("dynamicFormData", json, { shouldValidate: false });
    },
    [dynamicFormData, fields, setValue]
  );

  if (fields.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <DynamicField
          key={field.key}
          field={field}
          parentLabel={field.dependsOn ? (fields.find((f) => f.key === field.dependsOn)?.label ?? null) : null}
          lookups={lookups}
          value={read(field)}
          parentValue={parentOf(field, fields, read)}
          required={isFieldRequired(field, fields, read, lookups)}
          error={messageAt(formState.errors as Record<string, unknown>, errorPathFor(field))}
          onChange={(next) => write(field, next)}
        />
      ))}
    </div>
  );
}

function DynamicField({
  field,
  parentLabel,
  lookups,
  value,
  parentValue,
  required,
  error,
  onChange,
}: {
  field: DynamicFormField;
  parentLabel: string | null;
  lookups: Lookups;
  value: unknown;
  parentValue: unknown;
  required: boolean;
  error: string | undefined;
  onChange: (next: unknown) => void;
}) {
  const id = `cfg-${field.key}`;
  const parentId = parentValue == null || parentValue === "" ? null : String(parentValue);

  /* The one parented source. Loaded on open through the same server action the
     address cascade uses, keyed on the parent so choosing another sector
     invalidates the list rather than showing the previous one's cadres. */
  const loadDependent = React.useCallback(
    async (): Promise<ComboboxOption[]> =>
      (await loadSectorCategories(parentId ?? "")).map((r) => ({ value: r.value, label: r.label })),
    [parentId]
  );

  const isParented = field.dataSource != null && PARENTED_DATA_SOURCES.includes(field.dataSource);

  return (
    <div
      className={field.fullWidth || field.type === "textarea" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}
      /* The wizard's error focusing looks for this when a 422 names a field
         that has no stable input id of its own. */
      data-field={errorPathFor(field)}
    >
      <Label htmlFor={id}>
        {field.label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>

      {field.type === "textarea" ? (
        <Textarea
          id={id}
          placeholder={field.placeholder ?? undefined}
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "boolean" ? (
        <div className="flex h-9 items-center gap-2">
          <Checkbox
            id={id}
            checked={value === true || value === "true" || value === 1}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <Label htmlFor={id} className="text-sm font-normal text-muted-foreground">
            {field.placeholder ?? "Yes"}
          </Label>
        </div>
      ) : field.type === "select" ? (
        <Combobox
          id={id}
          value={value == null || value === "" ? null : String(value)}
          onChange={(v) => onChange(v ?? "")}
          /* A parented list is fetched for the chosen parent; every other
             source is already on the page. */
          {...(isParented
            ? {
                loadOptions: loadDependent,
                loadKey: parentId,
                disabled: !parentId,
                disabledMessage: `Select ${parentLabel ?? "the field above"} first`,
              }
            : { options: optionsFor(field, lookups) })}
          placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`}
          /* Names the exact screen, not "Master Data" in general. An officer
             who hits an empty list mid-registration can tell their
             administrator precisely where to go. */
          emptyMessage={
            field.dataSource == null
              ? "No choices are configured for this field."
              : `Nothing has been added to this list yet. It is managed under ${DYNAMIC_DATA_SOURCE_ORIGIN[field.dataSource].where}.`
          }
          invalid={Boolean(error)}
        />
      ) : (
        <Input
          id={id}
          type={field.type === "date" ? "date" : field.type === "text" ? "text" : "number"}
          inputMode={field.type === "currency" ? "decimal" : undefined}
          step={field.type === "currency" ? "0.01" : undefined}
          placeholder={field.placeholder ?? undefined}
          value={value == null ? "" : String(value)}
          onChange={(e) => {
            const raw = e.target.value;

            if (field.type !== "number" && field.type !== "currency") {
              onChange(raw);
              return;
            }

            /*
             * A NUMBER OR NOTHING — never an empty string, and never NaN.
             *
             * The payload schema types these as `number | null` and refuses
             * both. `Number("")` is 0, which would silently record a salary of
             * zero, and `Number("1.2.3")` is NaN, which a number input can hand
             * over mid-edit. Either one refused the whole save at the very end,
             * naming a field the officer had filled in correctly.
             */
            const parsed = raw.trim() === "" ? null : Number(raw);
            const value = parsed === null || !Number.isFinite(parsed) ? null : parsed;

            const name = structuredNameFor(field);

            /* A structured numeric column must be a number or null. A JSON slot
               may hold either, and null is still the honest answer for a box
               the officer emptied. */
            if (name !== null && isNumericTarget(name)) {
              onChange(value);
              return;
            }

            onChange(value === null ? "" : value);
          }}
        />
      )}

      {field.helpText && !error && <p className="text-[12px] text-muted-foreground">{field.helpText}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** The answer this field's list is filtered by, if it follows another. */
function parentOf(
  field: DynamicFormField,
  fields: DynamicFormField[],
  read: (f: DynamicFormField) => unknown
): unknown {
  if (!field.dependsOn) return null;
  const parent = fields.find((f) => f.key === field.dependsOn);
  return parent ? read(parent) : null;
}

/** The choices a select offers: an admin-managed list, or its fixed options. */
function optionsFor(field: DynamicFormField, lookups: Lookups): ComboboxOption[] {
  if (field.dataSource != null && field.dataSource !== "sector-categories") {
    return (lookups[field.dataSource] ?? []).map((r) => ({
      value: r.id,
      label: r.name,
      hint: r.description ?? undefined,
    }));
  }

  return (field.options ?? []).map((o) => ({ value: o, label: o }));
}

/** Reads a possibly-dotted error path out of React Hook Form's error tree. */
function messageAt(errors: Record<string, unknown>, path: string): string | undefined {
  const node = path
    .split(".")
    .reduce<unknown>((acc, part) => (acc == null ? acc : (acc as Record<string, unknown>)[part]), errors);

  const message = (node as { message?: unknown } | undefined)?.message;
  return typeof message === "string" ? message : undefined;
}
