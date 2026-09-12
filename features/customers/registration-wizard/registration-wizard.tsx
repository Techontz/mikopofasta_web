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
  SAVE_STEP_INDEX,
  FACE_STEP_INDEX,
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
import { CustomerDetailsStep } from "@/features/customers/registration-wizard/steps/customer-details-step";
import { KycAttachmentStep, KYC_ATTACHMENT_CODE } from "@/features/customers/registration-wizard/steps/kyc-attachment-step";
import { FaceVerificationStep } from "@/features/customers/registration-wizard/steps/face-verification-step";
import type { PendingDocument } from "@/features/customers/registration-wizard/steps/kyc-attachment-step";
import { missingDynamicAnswers } from "@/features/customers/registration-wizard/dynamic-form";
import { registrationFieldsFor } from "@/features/customers/registration-wizard/customer-type-fields";
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
 * Customer registration, in four steps.
 *
 *     Basic Information → Customer Details → KYC Attachments → Face Verification
 *
 * Three things about the shape are load-bearing.
 *
 * THE CUSTOMER TYPE IS ASKED ON STEP ONE AND SHAPES STEP TWO. It used to be the
 * first control on step two, which meant that step opened as an empty card with
 * a single dropdown in it. It is now asked with the rest of the basic details,
 * and step two is its consequence: the type's own configured form, plus the
 * standard block for what kind of customer it is — employment questions for an
 * employed customer, business questions for a trader. No customer type is named
 * anywhere in this directory, and adding one, or adding a question to one, is a
 * save on an administration screen rather than a deployment.
 *
 * THE CUSTOMER IS CREATED ON STEP THREE, AND STEP FOUR RUNS AGAINST THEM.
 * Everything before Save is a draft — held on the server, so it survives the
 * device — and the save produces a real customer whose status reads "Awaiting
 * face verification". Face Verification is the fourth step and it is
 * compulsory, but it is reached only BY that save: a biometric check needs a
 * record to check against, so the wizard has no path to it from the Next
 * button and the step cannot be opened early.
 *
 * Being compulsory is a rule about this FLOW, not about the record. The
 * customer is already written by the time the camera appears, so an officer
 * whose browser dies loses nothing and the same scan sits on the customer's
 * profile for whoever next has them in front of a camera. What the wizard no
 * longer does is offer to walk away from it.
 *
 * WHAT EACH STEP REQUIRES COMES FROM TWO PLACES AND NEITHER IS THIS FILE. The
 * account type's requirement profile — a row from `account_type_requirements`,
 * the same row `RegisterCustomerRequest` validates against — governs the
 * address, the identity document, the payment account and the guarantors. The
 * customer type governs everything on step two. Both are read at runtime, so
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
   * type code it will be filed under. One entry, in practice: registration
   * takes the customer's KYC pack as a single attachment — see
   * KycAttachmentStep.
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

    /*
     * THE SAME LIST THE STEP DRAWS, composed by the same function.
     *
     * It used to be `selectedCategory.dynamicFormSchema` — the configured
     * fields alone — while step two also rendered the standard block for the
     * customer type's sector. Validating one list and rendering another is how
     * a required answer goes unasked, or an answered question is reported
     * missing.
     */
    return missingDynamicAnswers(
      registrationFieldsFor(selectedCategory, profile),
      (field) => {
        const name = structuredNameFor(field);
        return name === null ? values.dynamicFormData[field.key] : values[name];
      },
      lookups
    );
  }, [selectedCategory, getValues, lookups, profile]);

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

    /*
     * SAVE AND CONTINUE, WHERE THE BUTTON SAYS SO.
     *
     * The step buttons used to read "Next" over a form whose only persistence
     * was a copy in this browser's localStorage — so an officer who moved to
     * step two, then lost the tab, lost the registration, and nothing had ever
     * suggested otherwise. Advancing now writes the server draft as well, which
     * is what makes the same registration resumable from another desk.
     *
     * Not awaited: the officer is already on the next step and has nothing to
     * wait for. Silent on success for the same reason — but never on failure,
     * because somebody told their work was safe when it is not is worse off
     * than somebody told nothing. See `saveDraft`.
     */
    void saveDraft(true);
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
    const attachmentMissing = !documents.some((d) => d.code === KYC_ATTACHMENT_CODE);
    const ATTACHMENT_REQUIRED = "Attach the customer's KYC documents before saving.";

    const blocking = {
      ...validateStepAgainstProfile("basic", values, profile),
      ...validateStepAgainstProfile("details", values, profile),
      /* And the customer type's own rules, re-checked at Save. The officer can
         reach step three by pressing Next before choosing a customer type, then
         go back and choose one — so the questions it brings with it have to be
         judged here too, not only on the step that asked them. */
      ...categoryErrors(),
      /*
       * THE KYC ATTACHMENT, CHECKED BEFORE THE CUSTOMER IS CREATED.
       *
       * It has to be checked here rather than by the API, and that is a
       * consequence of the order the work happens in: the upload endpoint is
       * keyed on a customer id, so the file cannot be sent until the record
       * exists. Refusing at Save is therefore the only point at which "no KYC
       * documents" can mean "no customer" rather than "a customer with an
       * empty file".
       *
       * The rule is not weakened by living here. The server judges the same
       * fact from the other side — KycEvaluator marks a customer whose file
       * lacks what their ID type calls for as KYC incomplete, which is what
       * stops them borrowing. This stops the registration; that stops the
       * consequence.
       */
      ...(attachmentMissing ? { [`documents.${KYC_ATTACHMENT_CODE}`]: ATTACHMENT_REQUIRED } : {}),
    };

    setIdentityError(attachmentMissing ? ATTACHMENT_REQUIRED : null);

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

    /*
     * THE BANK BLOCK, ASSEMBLED HERE rather than bound to the form.
     *
     * `bankDetails` is the API's record of account and its three strings are
     * required together — binding inputs straight to them would mean a form
     * whose schema refuses an officer who has chosen a mobile wallet, because
     * the object would exist with empty members. So the officer fills in flat
     * fields, the chooser guarantees only one kind of account holds anything
     * (see PaymentDetailsStep), and the object is built once, here, from what
     * they actually answered.
     *
     * Keyed on the account NUMBER, which is the same fact the API tests for
     * (RegisterCustomerRequest::checkBankAccount): a bank chosen with no
     * account number is not an account.
     *
     * `paymentMethod` IS SENT, and is the answer of record. It used to be
     * stripped here as the form's own bookkeeping, on the reasoning that the
     * API records accounts rather than preferences between them — but the
     * preference is a fact the officer stated, and rebuilding it afterwards
     * from whichever columns happen to be filled gets it wrong in both
     * directions. "none" travels as null: it means no account was given, which
     * is legitimate for an account type that requires none.
     */
    const { paymentMethod, ...payload } = values;

    const bankDetails =
      paymentMethod === "bank" && (values.accountNumber ?? "").trim() !== ""
        ? {
            bankName: values.bankName ?? "",
            accountNumber: (values.accountNumber ?? "").trim(),
            accountName: (values.accountName ?? "").trim(),
            /* The customer's own number, so a payment can be traced back to a
               person rather than to an account string alone. */
            phoneNumber: values.phone,
          }
        : null;

    const result = await registerCustomer({
      ...payload,
      paymentMethod: paymentMethod === "none" ? null : paymentMethod,
      bankDetails,
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

    /* THE FOURTH STEP OPENS HERE, and only here. Face Verification runs against
       a customer who must already exist, so the save is what makes it
       reachable — there is no path to it from the Next button. */
    setStep(FACE_STEP_INDEX);

    toast.success(
      result.customerNumber
        ? `Saved as ${result.customerNumber}. Face verification completes the registration.`
        : "Saved. Face verification completes the registration.",
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
   * Before the customer exists the officer may walk the whole form freely, and
   * nothing is lost either way — the wizard is one React Hook Form, so every
   * value typed on step one is still there when they come back to it. After the
   * save the earlier steps describe a record that has already been written and
   * this screen can only create, so letting somebody back into "Basic
   * Information" would offer an edit that silently does nothing. Corrections
   * after that point are made on the customer's profile, which can actually
   * apply them.
   */
  const canGoBack = savedCustomer === null && step > 0;

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
        {/*
          Four steps, and the label is readable at every width — it used to be
          hidden below `sm`, which left a phone showing numbered circles and no
          way to tell what any of them were. The labels wrap instead.
        */}
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs" aria-label="Registration steps">
          {WIZARD_STEPS.map((s, i) => {
            /* Done means done. The three steps behind the current one are
               finished facts once passed; the fourth is finished only when the
               scan has passed, which is the whole point of numbering it. */
            const done = s.id === "face" ? faceVerified : i < step;
            const current = i === step;

            return (
              <li key={s.id} className="flex items-center gap-1.5">
                <span
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border font-medium",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : current
                        ? "border-primary text-primary ring-2 ring-primary/20"
                        : "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className={cn(current ? "font-medium" : "text-muted-foreground")}>
                  {s.label}
                </span>
                {i < WIZARD_STEPS.length - 1 && (
                  <ChevronRight className="mx-1 size-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
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
                categories={categories}
                idTypes={lookups["id-types"]}
                maritalStatuses={lookups["marital-statuses"]}
                profile={profile}
              />
            )}

            {currentStepId === "details" && (
              <CustomerDetailsStep categories={categories} lookups={lookups} profile={profile} />
            )}

            {currentStepId === "documents" && (
              <KycAttachmentStep
                documents={documents}
                error={identityError ?? undefined}
                onChange={(next) => {
                  setDocuments(next);
                  /* Attaching it answers the complaint; keeping the red text
                     under a filled slot would be the form arguing with what is
                     in front of the officer. */
                  if (next.length > 0) setIdentityError(null);
                }}
              />
            )}

            {currentStepId === "face" && savedCustomer && (
              <FaceVerificationStep
                customerId={savedCustomer.id}
                customerName={savedCustomer.name}
                required
                verified={faceVerified}
                submitting={isSubmitting}
                onCapture={submitFace}
                onDone={() => router.push(`/customers/${savedCustomer.id}`)}
              />
            )}

          </CardContent>
        </Card>

        {/* ------------------------------------------------------- the buttons */}
        {/* Gone once the customer exists: step three then carries its own —
            capture, or finish later. A Next button beside a camera would
            suggest the scan is skippable in place, and a Save beside a record
            that has already been written would offer to write it twice. */}
        {!savedCustomer && (
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
                <Button type="button" onClick={saveRegistration} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Complete Registration
                  <Check className="size-4" />
                </Button>
              ) : (
                <Button type="button" onClick={goNext}>
                  Save &amp; Continue
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
