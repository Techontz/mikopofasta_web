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
import { NotificationTemplateSchema, NOTIFICATION_TRIGGER_EVENTS, type NotificationTemplate } from "@/types/notification-template";
import { NOTIFICATION_CHANNELS } from "@/types/enums";
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

export function TemplateFormDialog({ template }: { template?: NotificationTemplate }) {
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
      const result = isEdit ? await updateNotificationTemplate(template!.id, values) : await createNotificationTemplate(values);
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
            {NOTIFICATION_TRIGGER_EVENTS.map((e) => (
              <option key={e} value={e} className="capitalize">
                {e.replace(/_/g, " ")}
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
            {NOTIFICATION_CHANNELS.map((c) => (
              <option key={c} value={c} className="uppercase">
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </FieldGrid>

      {/* A subject only exists for email — the same condition as before. */}
      {channel === "email" && (
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
