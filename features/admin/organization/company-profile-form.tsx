"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SettingsCard, SectionDivider } from "@/components/settings";
import {
  Button,
  Field,
  FieldGrid,
  Select,
  SettingsForm,
  TextArea,
  TextInput,
} from "@/components/settings/form";
import { UpdateCompanyProfileInputSchema, type CompanyProfile, type UpdateCompanyProfileInput } from "@/types/organization";
import type { Branch } from "@/types/branch";
import { updateCompanyProfile } from "@/features/admin/organization/company-profile-actions";

/**
 * Presentation refresh only. The resolver, the schema, the action, the dirty
 * check and the toast behaviour are all unchanged — the fields simply moved
 * onto the shared settings controls and gained the explanations that used to
 * live only in someone's head.
 */
export function CompanyProfileForm({ profile, branches, canEdit }: { profile: CompanyProfile; branches: Branch[]; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateCompanyProfileInput>({
    resolver: zodResolver(UpdateCompanyProfileInputSchema),
    defaultValues: {
      legalName: profile.legalName,
      tradingName: profile.tradingName,
      registrationNumber: profile.registrationNumber,
      tinNumber: profile.tinNumber,
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
      headquartersBranchId: profile.headquartersBranchId,
    },
  });

  function onSubmit(values: UpdateCompanyProfileInput) {
    startTransition(async () => {
      const result = await updateCompanyProfile(values);
      if (result.ok) toast.success(result.message ?? "Saved.");
      else toast.error(result.message ?? "Something went wrong.");
    });
  }

  return (
    <SettingsCard
      title="Company Profile"
      description="Core identity used across statements, receipts, and staff correspondence."
      footer={
        canEdit ? (
          <Button type="submit" form="company-profile" tone="primary" loading={pending} disabled={!isDirty}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        ) : undefined
      }
    >
      <SettingsForm id="company-profile" onSubmit={handleSubmit(onSubmit)}>
        <FieldGrid>
          <Field label="Legal name" htmlFor="legalName" required error={errors.legalName?.message}
                 help="As registered with BRELA. Appears on statements and contracts.">
            <TextInput id="legalName" disabled={!canEdit} invalid={!!errors.legalName} {...register("legalName")} />
          </Field>
          <Field label="Trading name" htmlFor="tradingName" required error={errors.tradingName?.message}
                 help="The name customers and staff see day to day.">
            <TextInput id="tradingName" disabled={!canEdit} invalid={!!errors.tradingName} {...register("tradingName")} />
          </Field>
          <Field label="Registration number" htmlFor="registrationNumber" error={errors.registrationNumber?.message}>
            <TextInput id="registrationNumber" disabled={!canEdit} invalid={!!errors.registrationNumber} {...register("registrationNumber")} />
          </Field>
          <Field label="TIN" htmlFor="tinNumber" error={errors.tinNumber?.message}
                 help="Taxpayer Identification Number issued by TRA.">
            <TextInput id="tinNumber" disabled={!canEdit} invalid={!!errors.tinNumber} {...register("tinNumber")} />
          </Field>
        </FieldGrid>

        <SectionDivider label="Contact" />

        <FieldGrid>
          <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
            <TextInput id="phone" type="tel" inputMode="tel" disabled={!canEdit} invalid={!!errors.phone} {...register("phone")} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <TextInput id="email" type="email" disabled={!canEdit} invalid={!!errors.email} {...register("email")} />
          </Field>
        </FieldGrid>

        <Field label="Registered address" htmlFor="address" error={errors.address?.message}>
          <TextArea id="address" rows={3} disabled={!canEdit} invalid={!!errors.address} {...register("address")} />
        </Field>

        <SectionDivider label="Hierarchy" />

        <Field
          label="Headquarters branch"
          htmlFor="headquartersBranchId"
          error={errors.headquartersBranchId?.message}
          help="The branch head-office transactions post against. Changing it does not move existing records."
          className="sm:max-w-md"
        >
          <Select id="headquartersBranchId" disabled={!canEdit} invalid={!!errors.headquartersBranchId} {...register("headquartersBranchId")}>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </Field>
      </SettingsForm>
    </SettingsCard>
  );
}
