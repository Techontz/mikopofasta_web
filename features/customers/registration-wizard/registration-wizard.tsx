"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  STEP_FIELDS,
  WIZARD_DRAFT_STORAGE_KEY,
  WIZARD_STEPS,
  WizardSchema,
  defaultWizardValues,
  type WizardValues,
} from "@/features/customers/registration-wizard/wizard-schema";
import { PersonalDetailsStep, type VerificationState } from "@/features/customers/registration-wizard/steps/personal-details-step";
import { ContactDetailsStep } from "@/features/customers/registration-wizard/steps/contact-details-step";
import { AddressStep } from "@/features/customers/registration-wizard/steps/address-step";
import { CategoryDataStep } from "@/features/customers/registration-wizard/steps/category-data-step";
import { GuarantorsStep } from "@/features/customers/registration-wizard/steps/guarantors-step";
import { NextOfKinStep } from "@/features/customers/registration-wizard/steps/next-of-kin-step";
import { ReviewStep } from "@/features/customers/registration-wizard/steps/review-step";
import { registerCustomer } from "@/features/customers/actions";
import type { Branch, District, Region, Street, Ward } from "@/types/branch";
import type { CustomerCategory } from "@/types/customer";

interface Draft {
  values: WizardValues;
  verification: VerificationState;
  step: number;
}

export function RegistrationWizard({
  branches,
  branchLocked,
  homeBranchId,
  categories,
  regions,
  districts,
  wards,
  streets,
}: {
  branches: Branch[];
  branchLocked: boolean;
  homeBranchId: string | null;
  categories: CustomerCategory[];
  regions: Region[];
  districts: District[];
  wards: Ward[];
  streets: Street[];
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [verification, setVerification] = React.useState<VerificationState>({ nidaVerifiedAt: null, otpVerifiedAt: null, faceVerifiedAt: null });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const restoredRef = React.useRef(false);

  const methods = useForm<WizardValues>({
    resolver: zodResolver(WizardSchema),
    defaultValues: defaultWizardValues(homeBranchId),
    mode: "onChange",
  });

  const { watch, reset, trigger, handleSubmit } = methods;

  React.useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(WIZARD_DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft: Draft = JSON.parse(raw);
      reset(draft.values);
      setVerification(draft.verification);
      setStep(draft.step);
      toast.info("Restored your in-progress registration draft.");
    } catch {
      // Corrupt/incompatible draft — ignore and start fresh.
    }
    // Mount-only by design: a saved draft is restored exactly once, and the
    // restoredRef guard makes any re-run a no-op. Including `reset` in the deps
    // would re-run this on every RHF identity change and clobber user edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const subscription = watch((values) => {
      const draft: Draft = { values: values as WizardValues, verification, step };
      localStorage.setItem(WIZARD_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    });
    return () => subscription.unsubscribe();
  }, [watch, verification, step]);

  const currentStepId = WIZARD_STEPS[step].id;
  const category = categories.find((c) => c.id === watch("customerCategoryId"));

  async function goNext() {
    if (currentStepId === "personal") {
      if (!verification.nidaVerifiedAt || !verification.otpVerifiedAt || !verification.faceVerifiedAt) {
        toast.error("Complete NIDA lookup, OTP, and face verification before continuing.");
        return;
      }
    }
    const valid = await trigger(STEP_FIELDS[currentStepId]);
    if (!valid) {
      toast.error("Please fix the highlighted fields before continuing.");
      return;
    }
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(values: WizardValues) {
    if (!verification.nidaVerifiedAt || !verification.otpVerifiedAt || !verification.faceVerifiedAt) {
      toast.error("Identity verification is incomplete.");
      return;
    }
    setIsSubmitting(true);
    const result = await registerCustomer({
      ...values,
      nidaVerifiedAt: verification.nidaVerifiedAt,
      otpVerifiedAt: verification.otpVerifiedAt,
      faceVerifiedAt: verification.faceVerifiedAt,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      toast.error(result.message ?? "Registration failed.");
      return;
    }
    localStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
    toast.success(result.message ?? "Customer registered.");
    if (result.customerId) router.push(`/customers/${result.customerId}`);
    else router.push("/customers");
  }

  return (
    <FormProvider {...methods}>
      <div className="space-y-5">
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs">
          {WIZARD_STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border font-medium",
                  i < step ? "border-primary bg-primary text-primary-foreground" : i === step ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("hidden sm:inline", i === step ? "font-medium" : "text-muted-foreground")}>{s.label}</span>
              {i < WIZARD_STEPS.length - 1 && <ChevronRight className="size-3.5 text-muted-foreground/50 mx-1" aria-hidden />}
            </li>
          ))}
        </ol>

        <Card>
          <CardContent className="pt-6">
            {currentStepId === "personal" && (
              <PersonalDetailsStep branches={branches} branchLocked={branchLocked} categories={categories} verification={verification} setVerification={setVerification} />
            )}
            {currentStepId === "contact" && <ContactDetailsStep />}
            {currentStepId === "address" && <AddressStep regions={regions} districts={districts} wards={wards} streets={streets} />}
            {currentStepId === "category-data" && <CategoryDataStep category={category} />}
            {currentStepId === "guarantors" && <GuarantorsStep />}
            {currentStepId === "next-of-kin" && <NextOfKinStep />}
            {currentStepId === "review" && <ReviewStep verification={verification} branches={branches} regions={regions} categories={categories} />}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 0}>
            <ChevronLeft className="size-4" />
            Back
          </Button>
          {currentStepId === "review" ? (
            <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Submit Registration
            </Button>
          ) : (
            <Button type="button" onClick={goNext}>
              Next
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </FormProvider>
  );
}
