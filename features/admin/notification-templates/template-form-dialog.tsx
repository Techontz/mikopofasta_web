"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, FieldGrid, IconButton, Select, TextArea, TextInput, Toggle } from "@/components/settings/form";
import { NotificationTemplateSchema, type NotificationTemplate } from "@/types/notification-template";
import type { NotificationTemplateVocabulary } from "@/lib/api/system-configuration";
import { createNotificationTemplate, updateNotificationTemplate } from "@/features/admin/notification-templates/actions";

const FormSchema = NotificationTemplateSchema.pick({
  name: true,
  triggerEvent: true,
  channel: true,
  subject: true,
  body: true,
  active: true,
});
type FormValues = z.infer<typeof FormSchema>;

function defaultsFor(template?: NotificationTemplate): FormValues {
  return {
    name: template?.name ?? "",
    triggerEvent: template?.triggerEvent ?? "loan_applied",
    channel: template?.channel ?? "sms",
    subject: template?.subject ?? null,
    body: template?.body ?? "",
    active: template?.active ?? true,
  };
}

/**
 * `vocabulary` is the server's — which events exist, which placeholders each can
 * fill, and which channels carry a subject.
 *
 * It is not duplicated here on purpose. The save endpoint validates a body's
 * placeholders against the event, so a list kept on this side could drift into
 * offering one the server then rejects: the message would look valid while it
 * was being written and fail on submit.
 */
export function TemplateFormDialog({
  template,
  vocabulary,
}: {
  template?: NotificationTemplate;
  vocabulary: NotificationTemplateVocabulary;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(template);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: defaultsFor(template) });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      /*
       * The subject is dropped for a channel that has none. Switching to SMS
       * hides the field but leaves whatever was typed in form state, and the
       * API refuses a subject on an SMS rather than silently ignoring it — so
       * without this, a template that looks fine on screen is rejected on save.
       */
      const payload: FormValues = { ...values, subject: hasSubject ? values.subject : null };

      const result = isEdit
        ? await updateNotificationTemplate(template!.id, payload)
        : await createNotificationTemplate(payload);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  const channel = useWatch({ control, name: "channel" });
  const triggerEvent = useWatch({ control, name: "triggerEvent" });
  const active = useWatch({ control, name: "active" });
  const body = useWatch({ control, name: "body" });

  const hasSubject = vocabulary.channels.find((c) => c.value === channel)?.hasSubject ?? false;

  // What this event can fill. Every {{placeholder}} in the body must be one of
  // these — an unknown one reaches the customer as the literal text.
  const placeholders =
    vocabulary.triggerEvents.find((e) => e.value === triggerEvent)?.placeholders ?? [];

  return (
    <SettingsDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaultsFor(template));
      }}
      trigger={
        isEdit ? (
          <IconButton icon={Pencil} label={`Edit ${template!.name}`} tone="secondary" />
        ) : (
          <Button tone="primary" icon={Plus}>
            New Template
          </Button>
        )
      }
      title={isEdit ? "Edit Notification Template" : "New Notification Template"}
      description={`Use double-curly placeholders like ${"{{customer_name}}"} — the dispatch engine fills these in per event.`}
      formId="template-form"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save changes" : "Create template"}
      pending={pending}
      size="lg"
    >
      <Field label="Name" htmlFor="tmpl-name" required error={errors.name?.message}>
        <TextInput id="tmpl-name" invalid={!!errors.name} {...register("name")} />
      </Field>

      <FieldGrid>
        <Field label="Trigger event" htmlFor="tmpl-trigger" error={errors.triggerEvent?.message}>
          <Select
            id="tmpl-trigger"
            className="capitalize"
            value={triggerEvent}
            onChange={(e) => setValue("triggerEvent", e.target.value as FormValues["triggerEvent"], { shouldDirty: true })}
          >
            {vocabulary.triggerEvents.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Channel" htmlFor="tmpl-channel" error={errors.channel?.message}>
          <Select
            id="tmpl-channel"
            className="uppercase"
            value={channel}
            onChange={(e) => setValue("channel", e.target.value as FormValues["channel"], { shouldDirty: true })}
          >
            {vocabulary.channels.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </FieldGrid>

      {/* A subject only exists for email, and the server is what says so. */}
      {hasSubject && (
        <Field label="Subject" htmlFor="tmpl-subject" error={errors.subject?.message}>
          <TextInput id="tmpl-subject" invalid={!!errors.subject} {...register("subject")} />
        </Field>
      )}

      <Field
        label="Body"
        htmlFor="tmpl-body"
        required
        error={errors.body?.message}
        help="Placeholders are replaced at send time."
      >
        <TextArea id="tmpl-body" rows={5} invalid={!!errors.body} {...register("body")} />
      </Field>

      {/*
        The palette for the chosen event. Clicking one appends it, because
        typing a placeholder from memory is how an unknown one gets in — and an
        unknown one is not a validation nicety: it reaches the customer as the
        literal text {{amount}}.
      */}
      <div className="space-y-1.5">
        <p className="text-[12px] text-muted-foreground">Available placeholders</p>
        <div className="flex flex-wrap gap-1.5">
          {placeholders.map((placeholder) => {
            const token = `{{${placeholder}}}`;
            const used = (body ?? "").includes(token);

            return (
              <button
                key={placeholder}
                type="button"
                onClick={() => setValue("body", `${body ?? ""}${token}`, { shouldDirty: true })}
                className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-colors ${
                  used
                    ? "border-[var(--st-accent-line)] bg-[var(--st-accent-soft)] text-[var(--st-accent-ink)]"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                title={used ? "Already in the message" : "Insert"}
              >
                {token}
              </button>
            );
          })}
        </div>
      </div>

      <Toggle
        id="tmpl-active"
        label="Active"
        help="Inactive templates are kept but never dispatched."
        checked={active}
        onCheckedChange={(next) => setValue("active", next, { shouldDirty: true })}
      />
    </SettingsDialog>
  );
}
