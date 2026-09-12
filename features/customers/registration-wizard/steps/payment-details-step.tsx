"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Banknote } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NO_AUTOFILL } from "@/features/customers/registration-wizard/no-autofill";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";
import type { MasterDataOption } from "@/types/master-data";

/**
 * Where the money goes — a mobile wallet or a bank account, never both.
 *
 * WHY THIS IS A CHOICE AND NOT TWO SECTIONS. The API asks for a bank account OR
 * a mobile money wallet and is indifferent to which
 * (RegisterCustomerRequest::checkBankAccount), because most microfinance
 * customers have only the second and refusing them an account for it would
 * exclude exactly the people the institution exists to serve. Rendering both
 * blocks at once made that indifference look like a demand for both: officers
 * filled in a bank name with no account number beside a wallet they had
 * already entered, and the record ended up carrying half of an account nobody
 * could pay into.
 *
 * WHAT IS NOT SHOWN IS ALSO CLEARED. Switching from Bank to MNO empties the
 * bank boxes rather than merely hiding them. A hidden value is still submitted,
 * and a bank name with no account number is exactly the half-record above —
 * except invisible, so nobody can see why the profile shows a bank the customer
 * does not use.
 *
 * WHERE EACH ANSWER LANDS. The wallet is `mobileMoneyProviderId` plus
 * `walletNumber`, both of them ordinary registration fields. The bank is
 * assembled at Save into `bankDetails`, which is the record of account — the
 * API mirrors its bank name and account number onto the customer's own columns
 * so a teller can search them, and `bankId` and `bankBranch` travel alongside
 * as the admin-managed reference. Nothing here invents a field: every one of
 * them has been in the contract since the legacy form.
 *
 * THE LISTS ARE THE INSTITUTION'S. Banks and mobile money providers are
 * master data; no provider is named in this file, and adding one is a save on
 * an administration screen.
 */
export function PaymentDetailsStep({
  banks,
  providers,
  profile,
}: {
  banks: MasterDataOption[];
  providers: MasterDataOption[];
  profile: AccountTypeRequirementProfile;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const method = watch("paymentMethod");
  const required = profile.requiresBankAccount;

  /**
   * Switches the kind of account, and forgets the other kind's answers.
   *
   * See the note above: a hidden value is still a submitted value.
   */
  function choose(next: WizardValues["paymentMethod"]) {
    if (next !== "mno") {
      setValue("mobileMoneyProviderId", "");
      setValue("mobileMoneyProvider", "");
      setValue("walletNumber", "");
    }

    if (next !== "bank") {
      setValue("bankId", "");
      setValue("bankName", "");
      setValue("bankBranch", "");
      setValue("accountName", "");
      setValue("accountNumber", "");
    }

    setValue("paymentMethod", next, { shouldValidate: true });
  }

  return (
    <section className="space-y-4 rounded-xl border p-4" data-field="paymentMethod">
      <div className="space-y-0.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Banknote className="size-4 text-muted-foreground" aria-hidden />
          Account Number
          {required && <span className="text-destructive">*</span>}
        </h3>
        <p className="text-[12px] text-muted-foreground">
          {required
            ? "This account type requires a mobile money wallet or a bank account."
            : "How this customer receives a disbursement and makes repayments."}
        </p>
      </div>

      {/* The kind of account, chosen from a list.
          It was two tiles filling a row of the form; a dropdown says the same
          thing in one line and reads like every other choice on this step.
          Clearing it is the box's own X — which is why the header no longer
          carries a separate "Clear".

          `choose` is untouched: it still empties the side being left behind,
          because a hidden value is still a submitted value. */}
      <div className="sm:max-w-sm">
        <Field
          label="Account Number"
          required={required}
          error={typeof errors.paymentMethod?.message === "string" ? errors.paymentMethod.message : undefined}
        >
          <Combobox
            id="paymentMethod"
            value={method === "none" ? null : method}
            onChange={(v) => choose((v as WizardValues["paymentMethod"]) ?? "none")}
            options={[
              { value: "mno", label: "Mobile Money (MNO)", hint: "A wallet held with a mobile network operator." },
              { value: "bank", label: "Bank Account", hint: "An account held with a bank." },
            ]}
            placeholder="Select payment account type"
            invalid={!!errors.paymentMethod}
          />
        </Field>
      </div>

      {method === "mno" && (
        <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
          <Field label="MNO Provider" required error={errors.mobileMoneyProviderId?.message}>
            <Combobox
              id="mobileMoneyProviderId"
              value={watch("mobileMoneyProviderId") || null}
              onChange={(v) => {
                setValue("mobileMoneyProviderId", v ?? "", { shouldValidate: true });
                /* The provider's NAME as well as its id. The API stores both,
                   and the text column is what a record captured before the list
                   existed carries — so a profile and a report read the same
                   answer whichever route the record came in by. */
                setValue("mobileMoneyProvider", providers.find((p) => p.id === v)?.name ?? "");
              }}
              options={providers.map((p) => ({ value: p.id, label: p.name, hint: p.description ?? undefined }))}
              placeholder="Select provider"
              emptyMessage="No mobile money providers are configured. Add them under Administration → Master Data."
              invalid={!!errors.mobileMoneyProviderId}
            />
          </Field>

          <Field
            label="Phone / Wallet Number"
            required
            error={errors.walletNumber?.message}
            help="The number the wallet is registered on, if it differs from the phone number above."
          >
            <Input {...NO_AUTOFILL} id="walletNumber" placeholder="0754000000" {...register("walletNumber")} />
          </Field>
        </div>
      )}

      {method === "bank" && (
        <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
          <Field label="Bank" required error={errors.bankId?.message}>
            <Combobox
              id="bankId"
              value={watch("bankId") || null}
              onChange={(v) => {
                setValue("bankId", v ?? "", { shouldValidate: true });
                /* The name is what `bankDetails` carries and what the API
                   mirrors onto the customer, so it is taken from the chosen row
                   rather than typed a second time. */
                setValue("bankName", banks.find((b) => b.id === v)?.name ?? "");
              }}
              options={banks.map((b) => ({ value: b.id, label: b.name, hint: b.description ?? undefined }))}
              placeholder="Select bank"
              emptyMessage="No banks are configured. Add them under Administration → Master Data."
              invalid={!!errors.bankId}
            />
          </Field>

          <Field label="Bank Branch" error={errors.bankBranch?.message} help="Where the account is held.">
            <Input {...NO_AUTOFILL} id="bankBranch" placeholder="Branch name" {...register("bankBranch")} />
          </Field>

          <Field label="Account Name" required error={errors.accountName?.message}>
            <Input {...NO_AUTOFILL} id="accountName" placeholder="Name the account is held in" {...register("accountName")} />
          </Field>

          <Field label="Account Number" required error={errors.accountNumber?.message}>
            <Input {...NO_AUTOFILL} id="accountNumber" inputMode="numeric" placeholder="Account number" {...register("accountNumber")} />
          </Field>
        </div>
      )}
    </section>
  );
}

/** Label above control, error below — the shape the rest of the wizard uses. */
function Field({
  label,
  required,
  error,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}:{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {help && !error && <p className="text-[12px] text-muted-foreground">{help}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
