"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SettingsCard } from "@/components/settings";
import { Button, DateInput, Field, FieldGrid, Select, TextInput } from "@/components/settings/form";
import { GENDERS, ShareholderInputSchema, type Shareholder, type ShareholderInput } from "@/types/capital";
import { saveShareholder } from "@/features/capital/shareholders/actions";

const EMPTY: ShareholderInput = {
  fullName: "",
  phone: "",
  email: "",
  gender: "male",
  dateOfBirth: "",
};

/**
 * Capital → Share Holders, the register form.
 *
 * Field order is the legacy screen's: name, phone, email, then gender and date
 * of birth on the second row. Doubles as the edit form — `editing` swaps the
 * card's title and the button, so a shareholder is corrected where they were
 * created rather than in a separate dialog.
 */
export function ShareholderForm({
  editing,
  onDone,
}: {
  editing?: Shareholder | null;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const defaults: ShareholderInput = editing
    ? {
        fullName: editing.fullName,
        phone: editing.phone,
        email: editing.email,
        gender: editing.gender,
        dateOfBirth: editing.dateOfBirth,
      }
    : EMPTY;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShareholderInput>({ resolver: zodResolver(ShareholderInputSchema), defaultValues: defaults });

  // Selecting a different shareholder to edit must repopulate the fields.
  React.useEffect(() => {
    reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaults is derived from `editing`
  }, [editing?.id]);

  function onSubmit(values: ShareholderInput) {
    startTransition(async () => {
      const result = await saveShareholder(values, editing?.id);
      if (result.ok) {
        toast.success(result.message);
        reset(EMPTY);
        onDone?.();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <SettingsCard
      title={editing ? `Edit ${editing.fullName}` : "Register Share Holder"}
      description={
        editing
          ? "Correcting an existing shareholder."
          : "A shareholder holds equity in the company. They are not staff and have no login."
      }
      footer={
        <>
          {editing && (
            <Button type="button" tone="secondary" onClick={onDone} disabled={pending}>
              Cancel
            </Button>
          )}
          <Button type="submit" form="shareholder-form" tone="primary" loading={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Save"}
          </Button>
        </>
      }
    >
      <form id="shareholder-form" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FieldGrid columns={3}>
          <Field label="Full name" htmlFor="sh-name" required error={errors.fullName?.message}>
            <TextInput id="sh-name" autoComplete="name" invalid={!!errors.fullName} {...register("fullName")} />
          </Field>
          <Field label="Phone no" htmlFor="sh-phone" required error={errors.phone?.message}>
            <TextInput id="sh-phone" type="tel" inputMode="tel" invalid={!!errors.phone} {...register("phone")} />
          </Field>
          <Field label="Email" htmlFor="sh-email" required error={errors.email?.message}>
            <TextInput id="sh-email" type="email" invalid={!!errors.email} {...register("email")} />
          </Field>
        </FieldGrid>

        <FieldGrid>
          <Field label="Gender" htmlFor="sh-gender" required error={errors.gender?.message}>
            <Select id="sh-gender" invalid={!!errors.gender} {...register("gender")}>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date of Birth" htmlFor="sh-dob" required error={errors.dateOfBirth?.message}>
            <DateInput id="sh-dob" invalid={!!errors.dateOfBirth} {...register("dateOfBirth")} />
          </Field>
        </FieldGrid>
      </form>
    </SettingsCard>
  );
}
