"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  FACE_STEP_INDEX,
  SAVE_STEP_INDEX,
  STEP_FIELDS,
  WIZARD_DRAFT_STORAGE_KEY,
  WIZARD_STEPS,
  WizardSchema,
  defaultWizardValues,
  requiredSteps,
  validateStepAgainstProfile,
  type WizardStepId,
  type WizardValues,
} from "@/features/customers/registration-wizard/wizard-schema";
import { BasicInformationStep } from "@/features/customers/registration-wizard/steps/basic-information-step";
import { AdditionalDetailsStep } from "@/features/customers/registration-wizard/steps/additional-details-step";
import { IdentityStep } from "@/features/customers/registration-wizard/steps/identity-step";
import { BankAccountStep } from "@/features/customers/registration-wizard/steps/bank-account-step";
import { RegistrationReviewStep } from "@/features/customers/registration-wizard/steps/registration-review-step";
import { FaceVerificationStep } from "@/features/customers/registration-wizard/steps/face-verification-step";
import { DraftResumeBanner } from "@/features/customers/registration-wizard/draft-resume-banner";
import type { MasterDataList, MasterDataOption } from "@/lib/api/master-data";
import type {
  AccountTypeRequirementProfile,
  RegistrationDraftSummary,
} from "@/lib/api/registration";
import { registerCustomer, uploadCustomerDocument, verifyCustomerFace } from "@/features/customers/actions";
import {
  markRegistrationDraftSubmitted,
  saveRegistrationDraft,
} from "@/features/customers/registration-drafts-actions";
import { appendReport, type FaceScanReport } from "@/features/customers/registration-wizard/face-scanner/face-report";
import type { Branch } from "@/types/branch";
import type { CustomerCategory, ExternalVerificationState } from "@/types/customer";

/**
 * Customer registration, as a six-step KYC workflow.
 *
 *     Basic → Additional → Identity → Bank → Review & Save → Face Verification
 *
 * Two things about the shape are load-bearing and neither was true before.
 *
 * THE CUSTOMER IS CREATED AT STEP FIVE, NOT AT THE END. Everything before it
 * is a draft — held on the server, so it survives the device — and the save
 * produces a real customer whose status reads "Awaiting face verification".
 * Step six is then optional in the sense that leaving it loses nothing: the
 * scan can be run here, or later, by anyone signed in, from any device with a
 * camera. The old wizard refused to submit at all without a face capture,
 * which meant a registration could only ever be completed in one sitting at a
 * desk with a working camera, and any interruption lost the whole form.
 *
 * WHAT EACH STEP REQUIRES COMES FROM THE ACCOUNT TYPE. `profile` is a row from
 * `account_type_requirements`, read from the API, and the same row is what
 * `RegisterCustomerRequest` validates against and what `KycEvaluator` judges
 * completeness by. The wizard is not a second opinion about the rules — it is
 * an earlier report of the same ones, so the officer is stopped on the step
 * that owns a field rather than at Save.
 */

interface LocalDraft {
  values: WizardValues;
  step: number;
  /** The server draft this local copy belongs to, if it has been saved once. */
  draftId: string | null;
}

export function RegistrationWizard({
  branches,
  branchLocked,
  homeBranchId,
  categories,
  currentUser,
  employees,
  canAssignOfficer,
  lookups,
  profiles,
  externalVerification,
  openDrafts,
}: {
  branches: Branch[];
  branchLocked: boolean;
  homeBranchId: string | null;
  categories: CustomerCategory[];
  /** The signed-in officer. The Employee field is them unless delegation is granted. */
  currentUser: { id: string; name: string };
  employees: { id: string; name: string }[];
  canAssignOfficer: boolean;
  lookups: Record<MasterDataList, MasterDataOption[]>;
  /** Every account type's requirement profile, keyed by account type id; null is the default. */
  profiles: AccountTypeRequirementProfile[];
  externalVerification: { nida: ExternalVerificationState; otp: ExternalVerificationState };
  openDrafts: RegistrationDraftSummary[];
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [attachment, setAttachment] = React.useState<File | null>(null);
  /* Which document type the attachment is filed under. Empty until chosen; an
     attachment with no type is not uploaded rather than being guessed at. */
  const [attachmentType, setAttachmentType] = React.useState("");

  /* Set once the record exists. From this point the wizard is operating on a
     real customer and the Save button is gone. */
  const [savedCustomer, setSavedCustomer] = React.useState<{ id: string; name: string } | null>(null);
  const [faceVerified, setFaceVerified] = React.useState(false);

  /* The server draft this session is editing, so a second save overwrites it
     rather than creating a second row. */
  const [draftId, setDraftId] = React.useState<string | null>(null);

  const methods = useForm<WizardValues>({
    resolver: zodResolver(WizardSchema),
    defaultValues: defaultWizardValues(homeBranchId, currentUser.id),
    mode: "onChange",
  });

  const { watch, reset, trigger, getValues, setError, clearErrors } = methods;

  const accountTypeId = watch("accountTypeId");

  /**
   * The profile governing this registration.
   *
   * Falls back to the default row — the one with a null account type — which
   * is what the form opens on, before an account type has been chosen. The API
   * resolves it the same way, so the two never disagree about which rules
   * apply.
   */
  const profile = React.useMemo(() => {
    const chosen = profiles.find((p) => p.accountTypeId === accountTypeId);
    const fallback = profiles.find((p) => p.isDefault);
    return chosen ?? fallback ?? EMPTY_PROFILE;
  }, [profiles, accountTypeId]);

  const required = React.useMemo(() => requiredSteps(profile), [profile]);
  const currentStepId = WIZARD_STEPS[step].id;

  /* ------------------------------------------------------------ local draft */

  /*
   * The browser copy, offered and never applied.
   *
   * Restoring a draft silently is how "Register Customer" ends up opening with
   * somebody else's identity already in it, which an officer has no way to
   * spot. So it is read into a banner and the officer chooses. The autosave
   * itself runs on every keystroke and is what survives an accidental refresh
   * between two server saves.
   */
  const [offeredLocal, setOfferedLocal] = React.useState<LocalDraft | null>(null);
  const restoredRef = React.useRef(false);

  React.useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(WIZARD_DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft: LocalDraft = JSON.parse(raw);
      const hasContent =
        Boolean(draft.values?.firstName) ||
        Boolean(draft.values?.phone) ||
        Boolean(draft.values?.nidaNumber);
      if (hasContent) setOfferedLocal(draft);
      else localStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
    } catch {
      // Corrupt or incompatible draft — drop it and start fresh.
      localStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
    }
    // Mount-only by design; the ref makes any re-run a no-op.
  }, []);

  React.useEffect(() => {
    /* Nothing is autosaved once the customer exists — the form is no longer
       the source of truth about them, the database is. */
    if (savedCustomer) return;

    const subscription = watch((values) => {
      const draft: LocalDraft = { values: values as WizardValues, step, draftId };
      try {
        localStorage.setItem(WIZARD_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        /* Quota, or a private window that refuses storage. The server draft is
           the real one; losing the keystroke-level copy is not worth an error
           in the officer's face. */
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, step, draftId, savedCustomer]);

  function clearLocalDraft() {
    try {
      localStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
    } catch {
      /* See above. */
    }
  }

  /** Applies a payload from either draft source into the form. */
  const applyDraft = React.useCallback(
    (values: Partial<WizardValues>, atStep: number, id: string | null) => {
      reset({ ...defaultWizardValues(homeBranchId, currentUser.id), ...values });
      setStep(Math.min(Math.max(atStep, 0), SAVE_STEP_INDEX));
      setDraftId(id);
      setOfferedLocal(null);
    },
    [reset, homeBranchId, currentUser.id]
  );

  /* ----------------------------------------------------------- server draft */

  async function saveDraft(silent = false): Promise<void> {
    const values = getValues();
    const label =
      [values.firstName, values.lastName].filter(Boolean).join(" ").trim() ||
      values.phone ||
      "Unnamed registration";

    if (!values.branchId) {
      if (!silent) toast.error("Select a branch before saving a draft.");
      return;
    }

    setIsSavingDraft(true);
    const result = await saveRegistrationDraft({
      id: draftId,
      branchId: values.branchId,
      label: label.slice(0, 160),
      phone: values.phone || null,
      step,
      payload: values as unknown as Record<string, unknown>,
    });
    setIsSavingDraft(false);

    if (!result.ok) {
      /* Never silent on failure. An officer who pressed Save and was told
         nothing would reasonably believe their work is safe. */
      toast.error(`Draft not saved: ${result.message}`);
      return;
    }

    if (result.draft) setDraftId(result.draft.id);
    if (!silent) toast.success("Draft saved. You can resume it from any device.");
  }

  /* ------------------------------------------------------------- navigation */

  async function goNext() {
    /* Zod first — types, formats, the date-of-birth rule — then the
       account-type rules, so a missing required field and a malformed one are
       both reported on the step that owns them. */
    const valid = await trigger(STEP_FIELDS[currentStepId]);

    const profileErrors = validateStepAgainstProfile(currentStepId, getValues(), profile);
    for (const [field, message] of Object.entries(profileErrors)) {
      setError(field as keyof WizardValues, { type: "profile", message });
    }

    if (!valid || Object.keys(profileErrors).length > 0) {
      toast.error("Please fix the highlighted fields before continuing.");
      focusFirstError(Object.keys(profileErrors)[0]);
      return;
    }

    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function goToStep(target: WizardStepId) {
    const index = WIZARD_STEPS.findIndex((s) => s.id === target);
    if (index >= 0) {
      clearErrors();
      setStep(index);
    }
  }

  /* ----------------------------------------------------------------- errors */

  /**
   * Puts a 422's field errors where the officer is looking.
   *
   * The API answers a rejected registration with a map of field to messages.
   * Dropping it and toasting "The given data was invalid." leaves someone
   * staring at forty inputs with no idea which one is wrong — and the wizard
   * has six steps, so the offending field may not even be on screen.
   */
  function applyServerErrors(fieldErrors: Record<string, string[]> | undefined, message?: string) {
    if (!fieldErrors || Object.keys(fieldErrors).length === 0) {
      toast.error(message ?? "Registration failed.");
      return;
    }

    /* Laravel reports nested failures with dot paths — `guarantors.0.phone`,
       `bankDetails.accountNumber`. React Hook Form uses the same notation, so
       the key transfers as-is and the message lands on the right row of a
       repeater rather than on the group. */
    const names = Object.keys(fieldErrors);
    for (const name of names) {
      const first = fieldErrors[name]?.[0];
      if (first) setError(name as keyof WizardValues, { type: "server", message: first });
    }

    const firstName = names[0];
    const owningStep = WIZARD_STEPS.findIndex((s) =>
      STEP_FIELDS[s.id].some((f) => firstName === f || firstName.startsWith(`${f}.`))
    );
    if (owningStep >= 0 && owningStep !== step) setStep(owningStep);

    focusFirstError(firstName);

    const summary = names
      .slice(0, 3)
      .map((n) => fieldErrors[n]?.[0])
      .filter(Boolean)
      .join(" ");
    toast.error(names.length > 3 ? `${summary} (+${names.length - 3} more)` : summary, {
      duration: 8000,
    });
  }

  function focusFirstError(name: string | undefined) {
    if (!name) return;
    // After the step has painted.
    setTimeout(() => {
      const el =
        document.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`) ??
        document.getElementById(name) ??
        document.getElementById(`kyc-${name}`) ??
        // Dynamic category fields have no stable input id — their wrapper
        // carries the dotted path instead.
        document.querySelector<HTMLElement>(`[data-field="${CSS.escape(name)}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
    }, 120);
  }

  /* ------------------------------------------------------------------ save */

  /**
   * Creates the customer. Step five's action, and the point the record starts
   * existing.
   *
   * No face capture is sent, and none is required: `faceVerifiedAt` is left
   * null because nothing has verified it. The API stamps it only when a
   * liveness sequence actually passes, which is step six.
   */
  async function saveRegistration() {
    const values = getValues();

    const profileErrors = {
      ...validateStepAgainstProfile("basic", values, profile),
      ...validateStepAgainstProfile("personal", values, profile),
      ...validateStepAgainstProfile("identity", values, profile),
      ...validateStepAgainstProfile("bank", values, profile),
    };

    if (Object.keys(profileErrors).length > 0) {
      for (const [field, message] of Object.entries(profileErrors)) {
        setError(field as keyof WizardValues, { type: "profile", message });
      }
      toast.error("Some required information is still missing. See the list above.");
      return;
    }

    const valid = await trigger();
    if (!valid) {
      toast.error("Please fix the highlighted fields before saving.");
      return;
    }

    setIsSubmitting(true);

    const result = await registerCustomer({
      ...values,
      /*
       * All three left null, and null is the honest value: no NIDA registry
       * was queried, no SMS code was sent, and no face has been scanned yet.
       * The API derives `registration_source` from these rather than trusting
       * the client, so a hand-entered record cannot claim to have come from a
       * registry.
       */
      nidaVerifiedAt: null,
      otpVerifiedAt: null,
      faceVerifiedAt: null,
    });

    if (!result.ok) {
      setIsSubmitting(false);
      applyServerErrors(result.fieldErrors, result.message);
      return;
    }

    const customerId = result.customerId;

    if (customerId) {
      /* The draft is closed, not deleted — it is the record of how long this
         registration took. A failure here leaves a stale open draft, which is
         a row somebody can discard, not a lost customer. */
      if (draftId) await markRegistrationDraftSubmitted(draftId, customerId);

      /*
       * The attachment, if one was chosen. Uploaded after the customer exists
       * because the endpoint is keyed on their id. A failure here is reported
       * and does not undo the registration: the customer is created, and the
       * document can be added from their profile.
       */
      if (attachment && attachmentType) {
        const form = new FormData();
        form.append("file", attachment);
        form.append("documentType", attachmentType);
        const upload = await uploadCustomerDocument(customerId, form);
        if (!upload.ok) {
          toast.error(`Customer saved, but the attachment did not upload: ${upload.message}`);
        }
      } else if (attachment) {
        toast.warning("Customer saved. The attachment was not filed — no document type was chosen.");
      }
    }

    clearLocalDraft();
    setIsSubmitting(false);

    if (!customerId) {
      /* Should not happen — the API returns the record it created — but
         sending the officer to a face step keyed on nothing would be worse. */
      toast.success(result.message ?? "Customer registered.");
      router.push("/customers");
      return;
    }

    setSavedCustomer({
      id: customerId,
      name: [values.firstName, values.middleName, values.lastName].filter(Boolean).join(" "),
    });
    setStep(FACE_STEP_INDEX);
    toast.success(result.message ?? "Customer registered. One step left: face verification.");
  }

  /** Step six's action. Runs against the customer created above. */
  async function submitFace(file: File, report: FaceScanReport) {
    if (!savedCustomer) return;

    setIsSubmitting(true);
    const form = new FormData();
    form.append("capture", file);
    appendReport(form, report);

    const result = await verifyCustomerFace(savedCustomer.id, form);
    setIsSubmitting(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setFaceVerified(true);
    toast.success("Face verification complete. This customer's KYC is now complete.");
    router.refresh();
  }

  /* ------------------------------------------------------------------- view */

  const canGoBack = step > 0 && step !== FACE_STEP_INDEX;

  return (
    <FormProvider {...methods}>
      <div className="space-y-5">
        {!savedCustomer && (
          <DraftResumeBanner
            local={offeredLocal}
            serverDrafts={openDrafts}
            currentUserId={currentUser.id}
            onResumeLocal={(draft) => applyDraft(draft.values, draft.step, draft.draftId)}
            onDiscardLocal={() => {
              clearLocalDraft();
              setOfferedLocal(null);
            }}
            onResumeServer={(payload, atStep, id) =>
              applyDraft(payload as Partial<WizardValues>, atStep, id)
            }
          />
        )}

        {/* ------------------------------------------------------ the stepper */}
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs">
          {WIZARD_STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border font-medium",
                  i < step
                    ? "border-primary bg-primary text-primary-foreground"
                    : i === step
                      ? "border-primary text-primary"
                      : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("hidden sm:inline", i === step ? "font-medium" : "text-muted-foreground")}>
                {s.label}
                {/* An optional step says so, rather than looking identical to a
                    mandatory one and leaving the officer to guess. */}
                {!required.has(s.id) && (
                  <span className="ml-1 text-[10px] text-muted-foreground">(optional)</span>
                )}
              </span>
              {i < WIZARD_STEPS.length - 1 && (
                <ChevronRight className="mx-1 size-3.5 text-muted-foreground/50" aria-hidden />
              )}
            </li>
          ))}
        </ol>

        <Card>
          <CardContent className="pt-6">
            {currentStepId === "basic" && (
              <BasicInformationStep
                branches={branches}
                branchLocked={branchLocked}
                currentUser={currentUser}
                employees={employees}
                canAssignOfficer={canAssignOfficer}
                loanTypes={lookups["loan-types"]}
                customerTypes={lookups["customer-types"]}
                accountTypes={lookups["account-types"]}
                profile={profile}
              />
            )}

            {currentStepId === "personal" && (
              <AdditionalDetailsStep
                maritalStatuses={lookups["marital-statuses"]}
                occupations={lookups.occupations}
                categories={categories}
                profile={profile}
              />
            )}

            {currentStepId === "identity" && (
              <IdentityStep
                profile={profile}
                externalVerification={externalVerification}
                documentTypes={lookups["document-types"]}
                attachment={attachment}
                attachmentType={attachmentType}
                onAttachment={setAttachment}
                onAttachmentType={setAttachmentType}
              />
            )}

            {currentStepId === "bank" && (
              <BankAccountStep
                banks={lookups.banks}
                mobileMoneyProviders={lookups["mobile-money-providers"]}
                profile={profile}
              />
            )}

            {currentStepId === "review" && (
              <RegistrationReviewStep
                profile={profile}
                branches={branches}
                categories={categories}
                lookups={{
                  loanTypes: lookups["loan-types"],
                  customerTypes: lookups["customer-types"],
                  accountTypes: lookups["account-types"],
                  maritalStatuses: lookups["marital-statuses"],
                  banks: lookups.banks,
                }}
                externalVerification={externalVerification}
                onEditStep={goToStep}
              />
            )}

            {currentStepId === "face" &&
              (savedCustomer ? (
                <FaceVerificationStep
                  customerId={savedCustomer.id}
                  customerName={savedCustomer.name}
                  required={profile.requiresFaceVerification}
                  verified={faceVerified}
                  submitting={isSubmitting}
                  onCapture={submitFace}
                  onFinishLater={() => {
                    toast.info(
                      "Saved. The customer is awaiting face verification and can be found in the customer list."
                    );
                    router.push(`/customers/${savedCustomer.id}`);
                  }}
                />
              ) : (
                /* Unreachable through the buttons — the step is only entered
                   after a successful save — but a direct jump must not render
                   a camera keyed on no customer. */
                <p className="text-sm text-muted-foreground">
                  Save the registration first. Face verification runs against the saved customer.
                </p>
              ))}
          </CardContent>
        </Card>

        {/* ------------------------------------------------------- the buttons */}
        {currentStepId !== "face" && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="outline" onClick={goBack} disabled={!canGoBack}>
              <ChevronLeft className="size-4" />
              Back
            </Button>

            <div className="flex flex-wrap gap-2">
              {/* Save & resume is offered on every step before the customer
                  exists, not only at the end — an interruption does not wait
                  for a convenient moment. */}
              <Button type="button" variant="outline" onClick={() => saveDraft()} disabled={isSavingDraft}>
                {isSavingDraft ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save draft
              </Button>

              {step === SAVE_STEP_INDEX ? (
                <Button type="button" onClick={saveRegistration} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Save Customer Registration
                </Button>
              ) : (
                <Button type="button" onClick={goNext}>
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </FormProvider>
  );
}

/**
 * The last-resort profile, used only if the API returned no default row.
 *
 * The server treats a missing default as a configuration failure and refuses
 * (503), so this should never be reached. It requires nothing rather than
 * everything: a form that cannot learn its rules must not invent strict ones
 * and block an officer out of a screen they are entitled to use.
 */
const EMPTY_PROFILE: AccountTypeRequirementProfile = {
  accountTypeId: null,
  isDefault: true,
  requiresEmploymentDetails: false,
  requiresBusinessDetails: false,
  requiresBankAccount: false,
  requiresCardDetails: false,
  minGuarantors: 0,
  minNextOfKin: 0,
  requiresCustomerCategory: false,
  requiresMaritalStatus: false,
  requiresAddress: false,
  requiresIdentityDocument: false,
  requiresFaceVerification: false,
  requiresNidaVerification: false,
  requiresOtpVerification: false,
  guidance: null,
};
