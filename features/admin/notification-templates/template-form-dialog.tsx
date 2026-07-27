"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    watch,
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

  const channel = watch("channel");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaultsFor(template));
      }}
    >
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          ) : (
            <Button size="sm">
              <Plus className="size-4" />
              New Template
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Notification Template" : "New Notification Template"}</DialogTitle>
          <DialogDescription>Use double-curly placeholders like {"{{customer_name}}"} — the dispatch engine fills these in per event.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tmpl-name">Name</Label>
              <Input id="tmpl-name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Trigger event</Label>
              <Select value={watch("triggerEvent")} onValueChange={(v) => setValue("triggerEvent", v as FormValues["triggerEvent"])}>
                <SelectTrigger aria-label="Trigger event" className="w-full">
                  <SelectValue className="capitalize">{(v: string) => v.replace(/_/g, " ")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TRIGGER_EVENTS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setValue("channel", v as FormValues["channel"])}>
                <SelectTrigger aria-label="Channel" className="w-full">
                  <SelectValue className="uppercase" />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_CHANNELS.map((c) => (
                    <SelectItem key={c} value={c} className="uppercase">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {channel === "email" && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tmpl-subject">Subject</Label>
                <Input id="tmpl-subject" {...register("subject")} />
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tmpl-body">Body</Label>
              <Textarea id="tmpl-body" rows={4} {...register("body")} />
              {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="tmpl-active" checked={watch("active")} onCheckedChange={(v) => setValue("active", v === true)} />
              <Label htmlFor="tmpl-active" className="font-normal">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
