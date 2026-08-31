"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Loader2, Save, ScanFace } from "lucide-react";
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
  describeField,
  repairDraft,
  flattenErrors,
  stepOwning,
  validateStepAgainstProfile,
  type WizardValues,
} from "@/features/customers/registration-wizard/wizard-schema";
import { BasicInformationStep } from "@/features/customers/registration-wizard/steps/basic-information-step";
import { AdditionalDetailsStep } from "@/features/customers/registration-wizard/steps/additional-details-step";
import { DocumentsStep } from "@/features/customers/registration-wizard/steps/documents-step";
import { FaceVerificationStep } from "@/features/customers/registration-wizard/steps/face-verification-step";
import type { PendingDocument } from "@/features/customers/registration-wizard/steps/required-documents-step";
import { missingDynamicAnswers } from "@/features/customers/registration-wizard/dynamic-form";
import { structuredNameFor } from "@/features/customers/registration-wizard/structured-fields";
import { DraftResumeBanner } from "@/features/customers/registration-wizard/draft-resume-banner";
import type { MasterDataList, MasterDataOption } from "@/types/master-data";
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
import type { CustomerCategory } from "@/types/customer";

/**
 * Customer registration, in three steps.
 *
 *     Basic Information → Additional Details → Documents → Face Verification
 *
 * Three things about the shape are load-bearing.
 *
 * STEP TWO IS NOT WRITTEN DOWN. It asks for the Customer Type and then renders
 * whatever that type's configured registration form declares — its fields,
 * their types, the lists they draw on, which of them depend on which, and what
 * makes each one mandatory. No customer type is named anywhere in this
 * directory, and adding one, or adding a question to one, is a save on an
 * administration screen rather than a deployment.
 *
 * THE CUSTOMER IS CREATED ON STEP THREE, BEFORE THE FACE SCAN. Everything
 * before Save is a draft — held on the server, so it survives the device — and
 * the save produces a real customer whose status reads "Awaiting face
 * verification". The scan then runs on the same page, or an hour later from a
 * phone, by whoever has the customer in front of them. The old wizard refused
 * to submit at all without a capture, which meant a registration could only
 * ever be completed in one sitting at a desk with a working camera, and any
 * interruption lost the whole form.
 *
 * WHAT EACH STEP REQUIRES COMES FROM TWO PLACES AND NEITHER IS THIS FILE. The
 * account type's requirement profile — a row from `account_type_requirements`,
 * the same row `RegisterCustomerRequest` validates against — governs the
 * address, the identity document and the guarantors. The customer type's
 * configured form governs everything on step two. Both are read at runtime, so
 * the wizard is never a second opinion about the rules: it is an earlier report
 * of the same ones, delivered on the step that owns the field rather than at
 * Save.
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
  openDrafts: RegistrationDraftSummary[];
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  /*
   * The documents chosen for this registration, each already paired with the
   * type code it will be filed under. One slot per code the category requires,
   * plus anything extra the branch attached — see RequiredDocumentsStep.
   *
   * Held here rather than in the form because a File is not serialisable and
   * must never reach the draft that is saved to the server.
   */
  const [documents, setDocuments] = React.useState<PendingDocument[]>([]);

  /*
   * Set when a Save was refused for want of the identity document, and cleared
   * the moment one is attached. Separate from the message itself so an empty
   * slot on a form nobody has submitted yet is not shown as an error — the
   * asterisk says it is required; this says it is missing.
   */
  const [identityError, setIdentityError] = React.useState<string | null>(null);



  /* Set once the record exists. From this point the wizard is operating on a
     real customer and the Save button is gone. */
  const [savedCustomer, setSavedCustomer] = React.useState<{
    id: string;
    name: string;
    customerNumber: string | null;
  } | null>(null);
  const [faceVerified, setFaceVerified] = React.useState(false);

  /* The server draft this session is editing, so a second save overwrites it
     rather than creating a second row. */
  const [draftId, setDraftId] = React.useState<string | null>(null);

  const methods = useForm<WizardValues>({
    resolver: zodResolver(WizardSchema),
    defaultValues: defaultWizardValues(homeBranchId, currentUser.id),
    mode: "onChange",
  });

  /* The category drives the document slots. Read from the form each render
     rather than mirrored into state — an effect syncing it would be a
     setState in an effect body, and the value is already here. */
  const selectedCategory = categories.find((c) => c.id === methods.watch("customerCategoryId"));

  /**
   * The document that evidences the ID type the officer chose on step one.
   *
   * Two lookups and no knowledge: the ID type carries a `documentTypeId` an
   * administrator set (Administration → Master Data → ID Types), and that names
   * a row in the document types list. Change the ID type and this changes with
   * it; link an ID type to a different document tomorrow and the form asks for
   * that one, with nothing deployed.
   *
   * Null is an ordinary answer — no ID type chosen yet, none linked to a
   * document, or the linked document type has since been deactivated. The
   * documents step then shows the customer type's list alone, which is exactly
   * what it did before this link existed.
   */
  const chosenIdTypeId = methods.watch("idTypeId");

  const identityDocument = React.useMemo(() => {
    const idType = lookups["id-types"].find((t) => t.id === chosenIdTypeId);
    if (!idType?.documentTypeId) return null;

    const document = lookups["document-types"].find((d) => d.id === idType.documentTypeId);
    if (!document) return null;

    return { code: document.code, name: document.name, idTypeName: idType.name };
  }, [chosenIdTypeId, lookups]);

  const { watch, reset, trigger, getValues, setError, clearErrors } = methods;

  /**
   * Reports a failed validation by NAME, on the step that owns it.
   *
   * Every refusal in this wizard goes through here, so none of them can end as
   * "please fix the highlighted fields" over a form with nothing highlighted.
   * It names the first failure, moves to the step that shows it — and only when
   * that is a different step, so a document problem never throws the officer
   * back to page one — scrolls to it and says how many others there are.
   */
  const reportFailure = React.useCallback(
    (failures: { path: string; message: string }[]) => {
      if (failures.length === 0) {
        toast.error("The form could not be saved, and did not say why. Please report this.");
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        /* The diagnostic the browser was missing. Field names and messages
           only — never the customer's answers. */
        console.warn(
          "[registration] validation refused the save:",
          failures.map((f) => ({ field: f.path, step: stepOwning(f.path), message: f.message })),
        );
      }

      const first = failures[0];
      const owning = WIZARD_STEPS.findIndex((s) => s.id === stepOwning(first.path));
      if (owning >= 0 && owning !== step) setStep(owning);

      const others = failures.length - 1;
      toast.error(
        `${describeField(first.path)}: ${first.message}${others > 0 ? ` (+${others} more)` : ""}`,
        { duration: 8000 },
      );

      focusFirstError(first.path);
    },
    /* `step` is what decides whether a move is needed; `focusFirstError` is a
       hoisted declaration and stable for the life of the component. */
    [step],
  );

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
      /* Repaired on the way in — a draft is JSON captured from an older shape
         of this form, and applying it unrepaired is how a save fails at the end
         over a field nobody touched in this sitting. */
      reset({ ...defaultWizardValues(homeBranchId, currentUser.id), ...repairDraft(values) });
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

  /**
   * What the chosen customer type still wants, if anything.
   *
   * The configured form's own rules — a field marked required, and a field made
   * required by another answer. Read from the configuration at the moment it is
   * checked, so a rule an administrator changed this morning is the rule
   * enforced this afternoon, and DynamicFormValidator applies the identical
   * rules on the server.
   */
  const categoryErrors = React.useCallback((): Record<string, string> => {
    if (!selectedCategory) return {};

    const values = getValues();

    return missingDynamicAnswers(
      selectedCategory.dynamicFormSchema,
      (field) => {
        const name = structuredNameFor(field);
        return name === null ? values.dynamicFormData[field.key] : values[name];
      },
      lookups
    );
  }, [selectedCategory, getValues, lookups]);

  async function goNext() {
    /*
     * Cleared first. `setError` on a field no input registered — which is every
     * field a customer type configures, since those are bound with `setValue` —
     * is not cleared by re-validating, so a message from a previous attempt
     * would otherwise sit in the error tree after the officer has answered it
     * and quietly refuse the next step.
     */
    clearErrors();

    /* Zod first — types, formats, the date-of-birth rule — then the
       account-type rules and the customer type's own, so a missing required
       field and a malformed one are both reported on the step that owns them. */
    const valid = await trigger(STEP_FIELDS[currentStepId]);

    const blocking = {
      ...validateStepAgainstProfile(currentStepId, getValues(), profile),
      ...(currentStepId === "details" ? categoryErrors() : {}),
    };

    for (const [field, message] of Object.entries(blocking)) {
      setError(field as keyof WizardValues, { type: "profile", message });
    }

    if (!valid || Object.keys(blocking).length > 0) {
      reportFailure([
        ...Object.entries(blocking).map(([path, message]) => ({ path, message })),
        ...flattenErrors(methods.formState.errors),
      ]);
      return;
    }

    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
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
    const owningStep = WIZARD_STEPS.findIndex((s) => s.id === stepOwning(firstName));
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
   * Creates the customer. Step three's action, and the point the record starts
   * existing.
   *
   * No face capture is sent, and none is required: `faceVerifiedAt` is left
   * null because nothing has verified it. The API stamps it only when a
   * liveness sequence actually passes, which is step six.
   */
  async function saveRegistration() {
    /* See goNext: an error left over from an earlier attempt on a field no
       input registered would survive re-validation and refuse a save the
       officer has already fixed. */
    clearErrors();

    const values = getValues();

    /* Narrowed once, so the check and the message cannot drift apart. */
    const identityMissing =
      identityDocument !== null && !documents.some((d) => d.code === identityDocument.code);

    const blocking = {
      ...validateStepAgainstProfile("basic", values, profile),
      ...validateStepAgainstProfile("details", values, profile),
      /* And the customer type's own rules, re-checked at Save. The officer can
         reach step three by pressing Next before choosing a customer type, then
         go back and choose one — so the questions it brings with it have to be
         judged here too, not only on the step that asked them. */
      ...categoryErrors(),
      /*
       * THE IDENTITY DOCUMENT, CHECKED BEFORE THE CUSTOMER IS CREATED.
       *
       * It has to be checked here rather than by the API, and that is a
       * consequence of the order the work happens in: the upload endpoint is
       * keyed on a customer id, so the file cannot be sent until the record
       * exists. Refusing at Save is therefore the only point at which "no
       * identity document" can mean "no customer" rather than "a customer with
       * a gap in their file".
       *
       * The rule is not weakened by living here. The server judges the same
       * fact from the other side — KycEvaluator's `identityDocumentFile` marks
       * a customer whose ID type calls for a document and lacks it as KYC
       * incomplete, which is what stops them borrowing. This stops the
       * registration; that stops the consequence.
       */
      ...(identityMissing
        ? {
            [`documents.${identityDocument.code}`]:
              `${identityDocument.name} is required. Upload the customer's ${identityDocument.idTypeName}.`,
          }
        : {}),
    };

    setIdentityError(
      identityMissing
        ? `${identityDocument.name} is required. Upload the customer's ${identityDocument.idTypeName}.`
        : null,
    );

    if (Object.keys(blocking).length > 0) {
      for (const [field, message] of Object.entries(blocking)) {
        setError(field as keyof WizardValues, { type: "profile", message });
      }
      /*
       * Moved to the step that owns the first failure — and ONLY when that is
       * a different step. A save rejected over a missing payslip should leave
       * the officer exactly where the payslip box is, not throw them back to
       * the first page of a form they have already filled in.
       *
       * Nothing is lost either way: the wizard is one form, and every value
       * survives the move.
       */
      reportFailure(Object.entries(blocking).map(([path, message]) => ({ path, message })));
      return;
    }

    /* Runs the resolver so each control paints its own error. */
    const valid = await trigger();

    if (!valid) {
      /*
       * WHAT REFUSED, IN ITS OWN WORDS.
       *
       * Read from the schema directly rather than from the form's error state.
       * React Hook Form's `trigger()` returns a boolean and nothing else, and
       * its error map is a proxy whose contents depend on which fields are
       * registered — every field a customer type configures is written with
       * `setValue` and registers nothing, so an error on one of those could be
       * true and invisible at the same time. Parsing the values is the one
       * answer that cannot disagree with the validator that just refused,
       * because it IS that validator.
       *
       * This is the branch that produced "Please fix the highlighted fields
       * before saving." over a form whose every visible field was filled in.
       */
      const parsed = WizardSchema.safeParse(getValues());

      reportFailure(
        parsed.success
          ? flattenErrors(methods.formState.errors)
          : parsed.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
      );
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
       * The documents, uploaded after the customer exists because the endpoint
       * is keyed on their id. Sequentially rather than in parallel: a branch
       * on a thin connection uploading five files at once is how all five time
       * out together.
       *
       * A failure here is REPORTED AND NAMED, and does not undo the
       * registration. The customer is created either way, and a document that
       * did not land can be added from their profile — but the officer has to
       * be told which one, or they will believe the file is on record.
       */
      const failed: string[] = [];

      for (const doc of documents) {
        const form = new FormData();
        form.append("file", doc.file);
        form.append("documentType", doc.code);

        const upload = await uploadCustomerDocument(customerId, form);

        if (!upload.ok) failed.push(doc.file.name);
      }

      if (failed.length > 0) {
        toast.error(
          `Customer saved, but ${failed.length} document${failed.length === 1 ? "" : "s"} did not upload: ${failed.join(", ")}. Add ${failed.length === 1 ? "it" : "them"} from the customer's profile.`,
        );
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
      customerNumber: result.customerNumber ?? null,
    });

    /* Straight on to the biometric step, against the record that now exists. */
    setStep(FACE_STEP_INDEX);
    toast.success(
      result.customerNumber
        ? `Saved as ${result.customerNumber}. One step left: face verification.`
        : "Saved. One step left: face verification.",
    );
  }

  /** The face capture. Runs against the customer created above, on the same step. */
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

  /*
   * Back stops at the save.
   *
   * Before the customer exists the officer may walk the whole form. After it,
   * the earlier steps describe a record that has already been written, and this
   * screen can only create — so letting somebody back into "Basic Information"
   * would offer an edit that silently does nothing. From step four they may
   * still step back to Documents, which is where the "already saved" state and
   * the route on to the scan both live.
   */
  const canGoBack = savedCustomer === null ? step > 0 : step > SAVE_STEP_INDEX;

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
          {WIZARD_STEPS.map((s, i) => {
            /* Done means done: once the customer exists, the three steps that
               produced them are finished facts, not places to go back to. */
            const done = i < step || (savedCustomer !== null && i <= SAVE_STEP_INDEX);
            const current = i === step;
            const biometric = s.id === "face";

            return (
              <li key={s.id} className="flex items-center gap-1">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border font-medium",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : current
                        ? "border-primary text-primary"
                        : "border-muted-foreground/30 text-muted-foreground",
                    /* The last step is a biometric check against a customer who
                       already exists, which is a different kind of act from the
                       three that precede it. Marked, so the stepper says so. */
                    biometric && !done && current && "ring-2 ring-primary/25",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : biometric ? <ScanFace className="size-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden sm:inline",
                    current ? "font-medium" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
                {i < WIZARD_STEPS.length - 1 && (
                  <ChevronRight className="mx-1 size-3.5 text-muted-foreground/50" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>

        {/* Where the record stands, once there is one. The distinction between
            "saved" and "complete" is the whole point of splitting these two
            steps, so it is stated rather than implied by a progress bar. */}
        {savedCustomer && (
          <p className="text-xs text-muted-foreground">
            {faceVerified ? (
              <span className="text-emerald-700 dark:text-emerald-400">
                Registration complete — {savedCustomer.name}
                {savedCustomer.customerNumber ? ` (${savedCustomer.customerNumber})` : ""} is verified.
              </span>
            ) : (
              <>
                Saved{savedCustomer.customerNumber ? ` as ${savedCustomer.customerNumber}` : ""} —
                awaiting face verification.
              </>
            )}
          </p>
        )}

        <Card>
          <CardContent className="pt-6">
            {currentStepId === "basic" && (
              <BasicInformationStep
                branches={branches}
                branchLocked={branchLocked}
                currentUser={currentUser}
                employees={employees}
                canAssignOfficer={canAssignOfficer}
                idTypes={lookups["id-types"]}
                profile={profile}
              />
            )}

            {currentStepId === "details" && (
              <AdditionalDetailsStep categories={categories} lookups={lookups} profile={profile} />
            )}

            {currentStepId === "documents" && (
              <DocumentsStep
                category={selectedCategory}
                identity={identityDocument}
                identityError={identityError ?? undefined}
                documentTypes={lookups["document-types"]}
                documents={documents}
                onDocumentsChange={(next) => {
                  setDocuments(next);
                  /* Attaching it answers the complaint; keeping the red text
                     under a filled slot would be the form arguing with what is
                     in front of the officer. */
                  if (identityDocument && next.some((d) => d.code === identityDocument.code)) {
                    setIdentityError(null);
                  }
                }}
                /* The API's answer, not a rule decided here. */
                blocking={profile.requiresCategoryDocuments}
                savedCustomer={savedCustomer}
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
                      "Saved. The customer is awaiting face verification and can be found in the customer list.",
                    );
                    router.push(`/customers/${savedCustomer.id}`);
                  }}
                />
              ) : (
                /*
                 * Reachable only by jumping the stepper: the button on step
                 * three is what creates the customer, and this step operates
                 * against that record. A camera keyed on nothing would produce
                 * a capture with nowhere to go.
                 */
                <p className="text-sm text-muted-foreground">
                  Save the registration on the previous step first. Face verification runs against
                  the saved customer.
                </p>
              ))}

          </CardContent>
        </Card>

        {/* ------------------------------------------------------- the buttons */}
        {/* Step four carries its own: capture, or finish later. A Next button
            beside a camera would suggest the scan is skippable in place. */}
        {currentStepId !== "face" && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="outline" onClick={goBack} disabled={!canGoBack}>
              <ChevronLeft className="size-4" />
              Back
            </Button>

            <div className="flex flex-wrap gap-2">
              {/* Save & resume is offered on every step before the customer
                  exists, not only at the end — an interruption does not wait
                  for a convenient moment. Once the record is real there is
                  nothing left to draft. */}
              {!savedCustomer && (
                <Button type="button" variant="outline" onClick={() => saveDraft()} disabled={isSavingDraft}>
                  {isSavingDraft ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save draft
                </Button>
              )}

              {step === SAVE_STEP_INDEX ? (
                <Button
                  type="button"
                  /*
                   * IDEMPOTENT BY CONSTRUCTION. Once the customer exists this
                   * button stops being a save and becomes navigation — coming
                   * back to this step and pressing it again moves on rather
                   * than registering the same person twice. Nothing about
                   * "have I already saved?" is left to the officer's memory or
                   * to a double-click guard.
                   */
                  onClick={savedCustomer ? () => setStep(FACE_STEP_INDEX) : saveRegistration}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {savedCustomer ? "Continue to Face Verification" : "Save & Continue to Face Verification"}
                  <ChevronRight className="size-4" />
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
  requiresCategoryDocuments: false,
  categoryDocumentsEnforcedFrom: null,
  requiresIdentityDocument: false,
  requiresFaceVerification: false,
  requiresNidaVerification: false,
  requiresOtpVerification: false,
  guidance: null,
};
