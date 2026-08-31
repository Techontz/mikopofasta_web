"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ListChecks, Plus, Trash2 } from "lucide-react";
import { SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, FieldGrid, IconButton, Select, TextInput, Toggle } from "@/components/settings/form";
import { updateCustomerCategory } from "@/features/admin/customer-categories/actions";
import { STRUCTURED_TARGETS } from "@/features/customers/registration-wizard/structured-fields";
import {
  DYNAMIC_DATA_SOURCE_LABELS,
  DYNAMIC_DATA_SOURCE_ORIGIN,
  DYNAMIC_DATA_SOURCES,
  DYNAMIC_FIELD_TYPE_LABELS,
  DYNAMIC_FIELD_TYPES,
  PARENTED_DATA_SOURCES,
  type CustomerCategory,
  type DynamicFieldType,
  type DynamicFormField,
} from "@/types/customer";
import type { MasterDataOption } from "@/types/master-data";

/**
 * Administration → Customer Types → Registration form.
 *
 * THIS SCREEN IS THE FEATURE. Everything the registration wizard asks a
 * customer on step two, and every document it asks them to produce on step
 * three, is a row saved from here. There is no other way for a question to
 * reach the registration form, and no code change makes one appear — which is
 * the acceptance test: create a customer type, configure it here, register
 * somebody under it, all without a deployment.
 *
 * KEPT SEPARATE FROM "ADD CUSTOMER TYPE", deliberately. Creating a
 * classification is naming it, and the create dialog asks for a name and
 * nothing else. Deciding what that classification then demands of a customer is
 * a different job, done later, usually by somebody thinking about KYC rather
 * than about naming things — so it has its own screen rather than turning a
 * one-field form into a nine-field one.
 *
 * THE KEY IS DERIVED, NOT ASKED. An administrator writes "Basic Salary" and
 * gets `basic_salary`; nobody should be asked to invent an identifier for
 * something they have just labelled. It stays editable, because the key is what
 * decides WHERE the answer is stored — a key the customer record already has a
 * column for is written to that column and stays searchable and reportable, and
 * this dialog says so on the field rather than leaving it invisible.
 */
export function RegistrationFormDialog({
  category,
  documentTypes,
}: {
  category: CustomerCategory;
  documentTypes: MasterDataOption[];
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();

  const [formTitle, setFormTitle] = React.useState(category.formTitle ?? "");
  const [description, setDescription] = React.useState(category.description ?? "");
  const [fields, setFields] = React.useState<DynamicFormField[]>(category.dynamicFormSchema);
  const [required, setRequired] = React.useState<string[]>(category.requiredDocuments);
  const [optional, setOptional] = React.useState<string[]>(category.optionalDocuments ?? []);

  function reset() {
    setFormTitle(category.formTitle ?? "");
    setDescription(category.description ?? "");
    setFields(category.dynamicFormSchema);
    setRequired(category.requiredDocuments);
    setOptional(category.optionalDocuments ?? []);
  }

  function patch(index: number, change: Partial<DynamicFormField>) {
    setFields((current) => current.map((f, i) => (i === index ? { ...f, ...change } : f)));
  }

  function move(index: number, by: -1 | 1) {
    const target = index + by;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const problem = firstProblem(fields);
    if (problem) {
      toast.error(problem);
      return;
    }

    startTransition(async () => {
      const result = await updateCustomerCategory(category.id, {
        /* The name goes with every save because the API validates one; nothing
           about it is being changed here. */
        name: category.name,
        formTitle: formTitle.trim() || null,
        description: description.trim() || null,
        dynamicFormSchema: fields.map(clean),
        requiredDocuments: required,
        optionalDocuments: optional,
      });

      toast[result.ok ? "success" : "error"](
        result.ok ? `${category.name}'s registration form saved.` : result.message
      );

      if (result.ok) setOpen(false);
    });
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
      trigger={
        <IconButton
          icon={ListChecks}
          label={`Configure the registration form for ${category.name}`}
          tone="secondary"
        />
      }
      title={`${category.name} — Registration form`}
      description="What registration asks a customer of this type, and which documents their file must contain. Changes apply to the next registration; customers already on file are untouched."
      formId="customer-type-registration-form"
      onSubmit={submit}
      submitLabel="Save Registration Form"
      pending={pending}
      size="lg"
    >
      <div className="space-y-7">
        <FieldGrid>
          <Field
            label="Section title"
            htmlFor="form-title"
            help="The heading shown over these questions during registration. Leave it empty to use the customer type's name."
          >
            <TextInput
              id="form-title"
              value={formTitle}
              placeholder={category.name}
              onChange={(e) => setFormTitle(e.target.value)}
            />
          </Field>
          <Field label="Description" htmlFor="form-description" help="Internal note. Not shown to the customer.">
            <TextInput
              id="form-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </FieldGrid>

        {/* ------------------------------------------------------- the fields */}
        <section className="space-y-3">
          <header className="flex items-center justify-between gap-3">
            <div>
              <h3 className="st-field-label">Registration fields</h3>
              <p className="st-field-help">
                Asked on step 2 of registration, in this order, after the customer type is chosen.
              </p>
            </div>
            <Button
              type="button"
              tone="secondary"
              icon={Plus}
              onClick={() =>
                setFields((current) => [
                  ...current,
                  { key: "", label: "", type: "text", required: false },
                ])
              }
            >
              Add Field
            </Button>
          </header>

          {fields.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-[var(--st-ink-faint)]">
              No fields yet. A customer of this type is asked nothing beyond the basic information.
            </p>
          ) : (
            <ol className="space-y-3">
              {fields.map((field, index) => (
                <FieldRow
                  key={index}
                  field={field}
                  index={index}
                  siblings={fields}
                  onChange={(change) => patch(index, change)}
                  onMove={(by) => move(index, by)}
                  onRemove={() => setFields((current) => current.filter((_, i) => i !== index))}
                />
              ))}
            </ol>
          )}
        </section>

        {/* ---------------------------------------------------- the documents */}
        <section className="space-y-3">
          <div>
            <h3 className="st-field-label">Required documents</h3>
            <p className="st-field-help">
              A slot appears for each of these on step 3 of registration. The documents offered
              here are created under {DYNAMIC_DATA_SOURCE_ORIGIN["document-types"].where}.
            </p>
          </div>

          <DocumentPicker
            documentTypes={documentTypes}
            selected={required}
            /* A code cannot be in both lists — it would give the officer two
               slots for one document with no way to tell them apart. */
            unavailable={optional}
            onChange={setRequired}
            emptyLabel="No documents are required of this customer type."
          />

          <div className="pt-2">
            <h3 className="st-field-label">Optional documents</h3>
            <p className="st-field-help">Offered a slot, never blocking.</p>
          </div>

          <DocumentPicker
            documentTypes={documentTypes}
            selected={optional}
            unavailable={required}
            onChange={setOptional}
            emptyLabel="None."
          />
        </section>
      </div>
    </SettingsDialog>
  );
}

/* ------------------------------------------------------------------- a field */

function FieldRow({
  field,
  index,
  siblings,
  onChange,
  onMove,
  onRemove,
}: {
  field: DynamicFormField;
  index: number;
  siblings: DynamicFormField[];
  onChange: (change: Partial<DynamicFormField>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const isSelect = field.type === "select";
  const usesList = isSelect && field.dataSource != null;
  const isParented = field.dataSource != null && PARENTED_DATA_SOURCES.includes(field.dataSource);
  const storedOnRecord = field.storesIn != null && field.storesIn !== "";

  /* Only fields that come BEFORE this one, and only fields that can have a
     stable answer to compare against. A rule pointing forwards would depend on
     an answer the officer has not been asked for yet. */
  const earlier = siblings.slice(0, index).filter((f) => f.key !== "");

  return (
    <li className="space-y-4 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="st-field-help pt-2">Field {index + 1}</span>
        <div className="flex gap-1">
          <IconButton icon={ArrowUp} label="Move up" tone="secondary" onClick={() => onMove(-1)} />
          <IconButton icon={ArrowDown} label="Move down" tone="secondary" onClick={() => onMove(1)} />
          <IconButton icon={Trash2} label="Remove this field" tone="danger" onClick={onRemove} />
        </div>
      </div>

      <FieldGrid columns={3}>
        <Field label="Label" required help="What the officer sees on the form.">
          <TextInput
            value={field.label}
            placeholder="e.g. Basic Salary"
            onChange={(e) => {
              const label = e.target.value;
              /* The key follows the label until somebody edits the key itself,
                 which is the moment it stops being derived. */
              const derived = field.key === "" || field.key === keyFrom(field.label);
              onChange(derived ? { label, key: keyFrom(label) } : { label });
            }}
          />
        </Field>

        <Field label="Key" required help="The internal name for this answer. Derived from the label.">
          <TextInput
            value={field.key}
            placeholder="basic_salary"
            onChange={(e) => onChange({ key: keyFrom(e.target.value) })}
          />
        </Field>

        <Field label="Type" required>
          <Select
            value={field.type}
            onChange={(e) => {
              const type = e.target.value as DynamicFieldType;
              /* A field that stops being a select stops having choices; leaving
                 them would keep validating against a list nobody can see. */
              onChange(
                type === "select"
                  ? { type }
                  : { type, dataSource: null, dependsOn: null, options: null }
              );
            }}
          >
            {DYNAMIC_FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {DYNAMIC_FIELD_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
      </FieldGrid>

      {isSelect && (
        <FieldGrid>
          <Field
            label="Choices from"
            /*
             * The most important sentence on this screen. Pointing a field at
             * a list is useless if the administrator cannot find where the
             * list's values are created — an empty dropdown at registration
             * time looks like a bug rather than a screen nobody has filled in
             * yet. So the chosen source names its own screen, here, at the
             * moment the choice is made.
             */
            help={
              field.dataSource
                ? `Read live. Values are created under ${DYNAMIC_DATA_SOURCE_ORIGIN[field.dataSource].where}.`
                : "An admin-managed list, read live. Leave it empty to type fixed choices below."
            }
          >
            <Select
              value={field.dataSource ?? ""}
              onChange={(e) => {
                const dataSource = e.target.value || null;
                onChange({
                  dataSource: dataSource as DynamicFormField["dataSource"],
                  options: dataSource ? null : field.options,
                });
              }}
            >
              <option value="">Fixed choices, typed below</option>
              {DYNAMIC_DATA_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {DYNAMIC_DATA_SOURCE_LABELS[source]}
                </option>
              ))}
            </Select>
          </Field>

          {!usesList && (
            <Field label="Choices" help="One per line.">
              <textarea
                className="st-control min-h-[76px] resize-y"
                value={(field.options ?? []).join("\n")}
                placeholder={"First choice\nSecond choice"}
                onChange={(e) =>
                  onChange({
                    options: e.target.value
                      .split("\n")
                      .map((o) => o.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
          )}
        </FieldGrid>
      )}

      <FieldGrid columns={2}>
        <Field
          label="Kept in"
          help={
            storedOnRecord
              ? "On the customer's record — searchable and reportable everywhere."
              : "With this customer type's other answers. Nothing else reads it."
          }
        >
          <Select
            value={field.storesIn ?? ""}
            onChange={(e) => onChange({ storesIn: e.target.value || null })}
          >
            <option value="">This customer type&apos;s answers</option>
            {Object.entries(STRUCTURED_TARGETS).map(([target, label]) => (
              <option key={target} value={target}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Follows"
          required={isParented}
          help={
            isParented
              ? "This list belongs to that field's answer, and reloads when it changes."
              : "Clears this answer whenever that field changes."
          }
        >
          <Select
            value={field.dependsOn ?? ""}
            onChange={(e) => onChange({ dependsOn: e.target.value || null })}
          >
            <option value="">Nothing</option>
            {earlier.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label || f.key}
              </option>
            ))}
          </Select>
        </Field>
      </FieldGrid>

      <FieldGrid>
        <Field label="Placeholder" help="Shown inside the empty control.">
          <TextInput
            value={field.placeholder ?? ""}
            placeholder="e.g. Andika kazi yake"
            onChange={(e) => onChange({ placeholder: e.target.value || null })}
          />
        </Field>
        <Field label="Help text" help="A line under the control.">
          <TextInput
            value={field.helpText ?? ""}
            onChange={(e) => onChange({ helpText: e.target.value || null })}
          />
        </Field>
      </FieldGrid>

      <div className="grid gap-4 sm:grid-cols-2">
        <Toggle
          label="Always required"
          checked={field.required}
          onCheckedChange={(next) => onChange({ required: next })}
        />
        <Toggle
          label="Full width"
          help="Spans both columns of the form."
          checked={field.fullWidth === true}
          onCheckedChange={(next) => onChange({ fullWidth: next })}
        />
      </div>

      {/* ------------------------------------------------ conditional required */}
      {!field.required && earlier.length > 0 && (
        <FieldGrid>
          <Field
            label="Required when"
            help="Leave empty for a field that is always optional."
          >
            <Select
              value={field.requiredWhen?.field ?? ""}
              onChange={(e) =>
                onChange({
                  requiredWhen: e.target.value
                    ? { field: e.target.value, equals: field.requiredWhen?.equals ?? [] }
                    : null,
                })
              }
            >
              <option value="">Never</option>
              {earlier.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label || f.key}
                </option>
              ))}
            </Select>
          </Field>

          {field.requiredWhen && (
            <Field
              label="…is one of"
              required
              help="The stable codes of the answers, one per line — not their labels, so renaming an entry does not break the rule."
            >
              <textarea
                className="st-control min-h-[76px] resize-y"
                value={field.requiredWhen.equals.join("\n")}
                placeholder="TEMPORARY"
                onChange={(e) =>
                  onChange({
                    requiredWhen: {
                      field: field.requiredWhen!.field,
                      equals: e.target.value
                        .split("\n")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    },
                  })
                }
              />
            </Field>
          )}
        </FieldGrid>
      )}
    </li>
  );
}

/* ---------------------------------------------------------------- documents */

function DocumentPicker({
  documentTypes,
  selected,
  unavailable,
  onChange,
  emptyLabel,
}: {
  documentTypes: MasterDataOption[];
  selected: string[];
  /** Already chosen in the other list, so not offered here. */
  unavailable: string[];
  onChange: (next: string[]) => void;
  emptyLabel: string;
}) {
  const offered = documentTypes.filter((d) => !unavailable.includes(d.code));

  if (offered.length === 0) {
    return (
      <p className="st-field-help">
        No document types are configured. They are added under{" "}
        {DYNAMIC_DATA_SOURCE_ORIGIN["document-types"].where}.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {offered.map((doc) => {
          const on = selected.includes(doc.code);
          return (
            <button
              key={doc.id}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(on ? selected.filter((c) => c !== doc.code) : [...selected, doc.code])
              }
              className={
                on
                  ? "rounded-full border border-[var(--st-accent)] bg-[var(--st-accent)]/10 px-3 py-1 text-xs font-medium"
                  : "rounded-full border px-3 py-1 text-xs text-[var(--st-ink-faint)] hover:border-[var(--st-line-strong)]"
              }
            >
              {doc.name}
            </button>
          );
        })}
      </div>
      {selected.length === 0 && <p className="st-field-help">{emptyLabel}</p>}
    </>
  );
}

/* ------------------------------------------------------------------ helpers */

/** "Basic Salary" → "basic_salary". The API accepts nothing else. */
function keyFrom(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

/**
 * The first thing that would make this configuration behave in a way nobody
 * asked for — reported here rather than as a 422 listing an array index.
 */
function firstProblem(fields: DynamicFormField[]): string | null {
  const keys = new Set<string>();

  for (const [i, field] of fields.entries()) {
    const where = `Field ${i + 1}`;

    if (field.label.trim() === "") return `${where} needs a label.`;
    if (field.key === "") return `${where} needs a key.`;
    if (keys.has(field.key)) return `${where} reuses the key "${field.key}". Each field needs its own.`;
    keys.add(field.key);

    if (field.type === "select" && !field.dataSource && (field.options ?? []).length === 0) {
      return `${where} is a select with no choices. Pick a list, or type the choices.`;
    }

    if (field.dataSource && PARENTED_DATA_SOURCES.includes(field.dataSource) && !field.dependsOn) {
      return `${where} draws on a list that belongs to a parent. Say which field filters it.`;
    }

    if (field.storesIn && fields.some((f, j) => j < i && f.storesIn === field.storesIn)) {
      return `${where} keeps its answer in the same place as an earlier field. Only one may.`;
    }

    if (field.requiredWhen && field.requiredWhen.equals.length === 0) {
      return `${where} has a "required when" rule with no values, so it can never apply.`;
    }
  }

  return null;
}

/** Drops the empty optionals, so a saved schema says only what was configured. */
function clean(field: DynamicFormField): DynamicFormField {
  return {
    key: field.key,
    label: field.label.trim(),
    type: field.type,
    required: field.required,
    ...(field.type === "select" && !field.dataSource ? { options: field.options ?? [] } : {}),
    ...(field.dataSource ? { dataSource: field.dataSource } : {}),
    ...(field.dependsOn ? { dependsOn: field.dependsOn } : {}),
    ...(field.storesIn ? { storesIn: field.storesIn } : {}),
    ...(field.requiredWhen ? { requiredWhen: field.requiredWhen } : {}),
    ...(field.placeholder ? { placeholder: field.placeholder } : {}),
    ...(field.helpText ? { helpText: field.helpText } : {}),
    ...(field.fullWidth ? { fullWidth: true } : {}),
  };
}
