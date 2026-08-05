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
import { LegacyBasicStep } from "@/features/customers/registration-wizard/steps/legacy-basic-step";
import { LegacyAdditionalStep } from "@/features/customers/registration-wizard/steps/legacy-additional-step";
import { LegacyPassportBankStep } from "@/features/customers/registration-wizard/steps/legacy-passport-bank-step";
import type { MasterDataList, MasterDataOption } from "@/lib/api/master-data";
import { activeIdentityProvider } from "@/features/customers/identity/active-provider";
import { registerCustomer, verifyCustomerFace } from "@/features/customers/actions";
import {
  appendReport,
  type FaceScanReport,
} from "@/features/customers/registration-wizard/face-scanner/face-report";
import type { Branch } from "@/types/branch";
import type { CustomerCategory } from "@/types/customer";

/**
 * What the wizard tracks outside the form: the photo and when it was taken.
 * Declared here now that the step that used to own it is gone.
 */
export interface VerificationState {
  faceVerifiedAt: string | null;
  faceCapture: File | null;
  /** What the scanner measured for `faceCapture` — sent with it. */
  faceReport: FaceScanReport | null;
}


interface Draft {
  values: WizardValues;
  /* Everything about the verification except the capture — a File cannot be
     written to localStorage, so the type says so rather than leaving a field
     that silently round-trips as `{}`. */
  verification: Omit<VerificationState, "faceCapture" | "faceReport">;
  step: number;
}

export function RegistrationWizard({
  branches,
  branchLocked,
  homeBranchId,
  categories,
  employees,
  lookups,
}: {
  branches: Branch[];
  branchLocked: boolean;
  homeBranchId: string | null;
  categories: CustomerCategory[];
  /** Staff the "Employee" dropdown offers — the officer owning the relationship. */
  employees: { id: string; name: string }[];
  /** Every admin-managed lookup list this form's dropdowns read. */
  lookups: Record<MasterDataList, MasterDataOption[]>;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [verification, setVerification] = React.useState<VerificationState>({
    faceVerifiedAt: null,
    faceCapture: null,
    faceReport: null,
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  /* The step-3 PDF, uploaded to customer-documents once the customer exists. */
  const [attachment, setAttachment] = React.useState<File | null>(null);
  const restoredRef = React.useRef(false);

  const methods = useForm<WizardValues>({
    resolver: zodResolver(WizardSchema),
    defaultValues: defaultWizardValues(homeBranchId),
    mode: "onChange",
  });

  const { watch, reset, trigger, handleSubmit } = methods;

  /*
   * A saved draft is OFFERED, never applied.
   *
   * THE BUG THIS FIXES. This effect used to `reset(draft.values)` on mount, so
   * the form silently refilled itself with whatever was last typed into it. Once
   * a NIDA lookup had run even once, that name, date of birth and gender came
   * back on every subsequent visit — and "Register Customer" opened showing a
   * person who was not the person standing at the counter. An officer had no way
   * to tell a restored draft from a fresh form, and no way to clear it: the
   * draft is rewritten on every keystroke, so editing the fields kept it alive.
   *
   * Registering a customer must start empty. That is not a preference, it is the
   * difference between a blank form and one pre-filled with somebody else's
   * identity. So the draft is read into a banner instead, and the officer
   * chooses: resume it, or discard it. Doing nothing leaves the form empty,
   * which is the safe default and the one they get by just carrying on.
   *
   * The autosave itself is unchanged — work in progress still survives a
   * refresh. Only the restore became a decision.
   */
  const [offeredDraft, setOfferedDraft] = React.useState<Draft | null>(null);

  React.useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(WIZARD_DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft: Draft = JSON.parse(raw);
      // An untouched draft is not worth offering — it would just be an empty
      // form asking whether you want an empty form.
      const hasContent =
        Boolean(draft.values?.nationalIdNumber) ||
        Boolean(draft.values?.firstName) ||
        Boolean(draft.values?.phone);
      if (hasContent) setOfferedDraft(draft);
      else localStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
    } catch {
      // Corrupt or incompatible draft — drop it and start fresh.
      localStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
    }
    // Mount-only by design; the ref makes any re-run a no-op.
  }, []);

  function resumeDraft() {
    if (!offeredDraft) return;
    reset(offeredDraft.values);
    /*
     * The face capture never survives a draft and must not appear to. A File
     * serialises to `{}` and reads back truthy, so restoring it verbatim would
     * leave `faceVerifiedAt` set with no image behind it — the fabricated
     * verification this flow used to have. Both are dropped; the photo is retaken.
     */
    setVerification({
      ...offeredDraft.verification,
      faceVerifiedAt: null,
      faceCapture: null,
      faceReport: null,
    });
    setStep(offeredDraft.step);
    setOfferedDraft(null);
    toast.info("Draft restored. Please capture the face again.");
  }

  function discardDraft() {
    localStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
    setOfferedDraft(null);
  }

  React.useEffect(() => {
    const subscription = watch((values) => {
      // `faceCapture` is deliberately not written: a File serialises to `{}`,
      // and the restore above discards it in any case.
      const { faceCapture: _capture, faceReport: _report, ...persistable } = verification;
      const draft: Draft = { values: values as WizardValues, verification: persistable, step };
      localStorage.setItem(WIZARD_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    });
    return () => subscription.unsubscribe();
  }, [watch, verification, step]);

  const currentStepId = WIZARD_STEPS[step].id;

  async function goNext() {
    /*
     * No photo gate on step 1 any more: the passport upload moved to step 3,
     * where the legacy form puts it. Requiring it here made Next unreachable —
     * the officer was told to supply a photo on a step that does not have one.
     * It is checked at submit instead, which is the first moment it can be.
     */
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

  /**
   * Puts a 422's field errors where the officer is looking.
   *
   * The API answers a rejected registration with a map of field to messages.
   * Dropping it and toasting "The given data was invalid." leaves someone
   * staring at forty inputs with no idea which one is wrong — and the wizard
   * has three steps, so the offending field may not even be on screen.
   *
   * Each message is attached to its own input, the step holding the first
   * failure is opened, and that input is scrolled to and focused. The toast
   * then summarises rather than being the only signal.
   */
  function applyServerErrors(fieldErrors: Record<string, string[]> | undefined, message?: string) {
    if (!fieldErrors || Object.keys(fieldErrors).length === 0) {
      toast.error(message ?? "Registration failed.");
      return;
    }

    /*
     * Laravel reports nested failures with dot paths — `guarantors.0.phone`,
     * `bankDetails.accountNumber`. React Hook Form uses the same notation, so
     * the key transfers as-is and the message lands on the right row of a
     * repeater rather than on the group.
     */
    const names = Object.keys(fieldErrors);
    for (const name of names) {
      const first = fieldErrors[name]?.[0];
      if (first) {
        methods.setError(name as keyof WizardValues, { type: "server", message: first });
      }
    }

    // Open the step that owns the first failure, so the highlighted field is
    // actually rendered before we try to scroll to it.
    const firstName = names[0];
    const owningStep = WIZARD_STEPS.findIndex((s) =>
      STEP_FIELDS[s.id].some((f) => firstName === f || firstName.startsWith(`${f}.`))
    );
    if (owningStep >= 0 && owningStep !== step) setStep(owningStep);

    // After the step has painted.
    setTimeout(() => {
      const el =
        document.querySelector<HTMLElement>(`[name="${CSS.escape(firstName)}"]`) ??
        document.getElementById(firstName) ??
        document.getElementById(`kyc-${firstName}`) ??
        // Dynamic category fields have no stable input id — their wrapper
        // carries the dotted path instead.
        document.querySelector<HTMLElement>(`[data-field="${CSS.escape(firstName)}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
    }, 120);

    const summary = names
      .slice(0, 3)
      .map((n) => fieldErrors[n]?.[0])
      .filter(Boolean)
      .join(" ");
    toast.error(names.length > 3 ? `${summary} (+${names.length - 3} more)` : summary, {
      duration: 8000,
    });
  }

  async function onSubmit(values: WizardValues) {
    // The capture is checked alongside the timestamps: `faceVerifiedAt` without
    // a file would be exactly the fabricated verification this flow used to
    // send, so neither is trusted without the other.
    if (!verification.faceVerifiedAt || !verification.faceCapture || !verification.faceReport) {
      toast.error("The customer's photo is required before registering.");
      return;
    }

    /* Registration takes a passing scan and nothing else. A failed one is a
       real record — the profile can take one, and does — but a customer whose
       liveness was never confirmed must not be created as if it had been. */
    if (verification.faceReport.status !== "passed") {
      toast.error("The face scan did not confirm liveness. Run the scan again before registering.");
      return;
    }
    setIsSubmitting(true);
    const result = await registerCustomer({
      ...values,
      /*
       * Whatever the active provider can honestly assert — null and null for
       * manual entry, real timestamps once a NIDA provider is assigned. The
       * wizard never invents these itself, which is the whole point of the
       * abstraction.
       */
      ...activeIdentityProvider.assuranceFor({
        firstName: values.firstName,
        middleName: values.middleName,
        lastName: values.lastName,
        dob: values.dob,
        gender: values.gender,
        nationalId: values.nationalIdNumber || null,
      }),
      faceVerifiedAt: verification.faceVerifiedAt,
    });

    if (!result.ok) {
      setIsSubmitting(false);
      applyServerErrors(result.fieldErrors, result.message);
      return;
    }

    /*
     * Now that the customer exists, send the capture to the endpoint that
     * actually checks it — `POST /customers/{id}/face-verify`, which runs the
     * liveness check and stores the image as the customer's photo. It cannot be
     * called before this point: it is keyed on a customer id that registration
     * is what creates.
     *
     * A failure here is reported and not hidden, but it does not discard the
     * registration: the customer is already created, and dropping the officer
     * back into a wizard whose submit would now collide with an existing NIDA
     * number would lose the whole form. Sending them to the record, which shows
     * the KYC state, is the recoverable outcome.
     */
    if (result.customerId) {
      const form = new FormData();
      form.append("capture", verification.faceCapture);
      appendReport(form, verification.faceReport);
      const faceResult = await verifyCustomerFace(result.customerId, form);
      if (!faceResult.ok) {
        toast.error(`Customer registered, but the face check failed: ${faceResult.message}`);
      }
    }

    setIsSubmitting(false);
    localStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
    toast.success(result.message ?? "Customer registered.");
    if (result.customerId) router.push(`/customers/${result.customerId}`);
    else router.push("/customers");
  }

  return (
    <FormProvider {...methods}>
      <div className="space-y-5">
        {/*
          The draft offer. Shown only when an unfinished registration is on
          this browser, and never applied until the officer says so — see the
          effect above for why silently restoring it was wrong.
        */}
        {offeredDraft && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3"
          >
            <p className="text-sm text-muted-foreground">
              You have an unfinished registration on this device
              {offeredDraft.values?.firstName ? (
                <>
                  {" "}
                  for <span className="font-medium text-foreground">{offeredDraft.values.firstName}</span>
                </>
              ) : null}
              . This form is otherwise empty.
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={resumeDraft}>
                Resume it
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={discardDraft}>
                Discard
              </Button>
            </div>
          </div>
        )}

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
            {/*
              Three pages, each composed from the step components that already
              owned these fields. Grouping changed; ownership did not — every
              component still registers its own fields and renders its own
              errors, so no validation rule moved house.
            */}
            {/*
              The three legacy steps, field-for-field. Grouping, order and
              button placement are the screenshots'; every dropdown reads the
              database. See each step component for its layout note.
            */}
            {currentStepId === "basic" && (
              <LegacyBasicStep
                branches={branches}
                branchLocked={branchLocked}
                employees={employees}
                loanTypes={lookups["loan-types"]}
                customerTypes={lookups["customer-types"]}
              />
            )}

            {currentStepId === "additional" && (
              <LegacyAdditionalStep
                maritalStatuses={lookups["marital-statuses"]}
                accountTypes={lookups["account-types"]}
                workTypes={lookups["work-types"]}
                employmentTypes={lookups["employment-types"]}
              />
            )}

            {currentStepId === "passport-bank" && (
              <LegacyPassportBankStep
                banks={lookups.banks}
                mobileMoneyProviders={lookups["mobile-money-providers"]}
                passport={verification.faceCapture}
                passportReport={verification.faceReport}
                onPassport={(file, scanReport) =>
                  setVerification((v) => ({
                    ...v,
                    /* Only a passing scan stamps a local time; the server
                       stamps the authoritative one when it records the scan. */
                    faceVerifiedAt:
                      file && scanReport?.status === "passed" ? new Date().toISOString() : null,
                    faceCapture: file,
                    faceReport: scanReport,
                  }))
                }
                attachment={attachment}
                onAttachment={setAttachment}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 0}>
            <ChevronLeft className="size-4" />
            Back
          </Button>
          {currentStepId === "passport-bank" ? (
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
