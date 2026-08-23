"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { CreditCard, Landmark, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { MasterDataOption } from "@/lib/api/master-data";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";

/**
 * Step 4 — Bank & Account details.
 *
 * What this step asks for is decided by the Account Type. The card block is
 * rendered only when the profile wants it; the bank block is marked required
 * only when the profile requires an account. The one thing that does not vary
 * is that A WALLET COUNTS: many microfinance customers hold no bank account at
 * all and settle everything through M-Pesa or Airtel Money, and a form that
 * insists on a bank account number would exclude exactly the people this
 * institution exists to serve. Either satisfies the requirement.
 *
 * `bankDetails` is a nested object on the payload and is assembled here rather
 * than registered field by field, because the API takes it as a group and
 * rejects a partial one — a bank name with no account number is not a bank
 * account.
 *
 * THE CARD NUMBER IS NEVER STORED. What the officer types reaches the API,
 * where it is immediately reduced to its last four digits and the rest
 * discarded; keeping a full PAN would put this application in PCI-DSS scope.
 * The note under the field says so, so nobody is surprised later by a record
 * showing only •••• 1111.
 *
 * The face capture used to live on this screen, beside the card fields, and
 * the form refused to submit without it. It is now step six — see
 * `wizard-schema.ts` for why that was the central defect in this flow.
 */
export function BankAccountStep({
  banks,
  mobileMoneyProviders,
  profile,
}: {
  banks: MasterDataOption[];
  mobileMoneyProviders: MasterDataOption[];
  profile: AccountTypeRequirementProfile;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const bankDetails = watch("bankDetails");
  const bankId = watch("bankId");

  const asOptions = (rows: MasterDataOption[]) => rows.map((r) => ({ value: r.id, label: r.name }));

  /**
   * Writes one field of the nested `bankDetails` object.
   *
   * The whole object is set to null when every field is emptied, because
   * `{bankName: "", accountNumber: "", ...}` would be sent as a bank account
   * and rejected by `required_with:bankDetails` — an error about a block the
   * officer thought they had left blank.
   */
  function setBank(field: "bankName" | "accountNumber" | "accountName" | "phoneNumber", value: string) {
    const next = {
      bankName: bankDetails?.bankName ?? "",
      accountNumber: bankDetails?.accountNumber ?? "",
      accountName: bankDetails?.accountName ?? "",
      phoneNumber: bankDetails?.phoneNumber ?? null,
      [field]: value,
    };

    const empty =
      next.bankName.trim() === "" &&
      next.accountNumber.trim() === "" &&
      next.accountName.trim() === "";

    setValue("bankDetails", empty ? null : next, { shouldValidate: true });
  }

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold">Bank &amp; Account Details</h2>

      {profile.requiresBankAccount ? (
        <p className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
          This account type needs somewhere to send and collect money — a bank account or a mobile
          money wallet. Either one is enough.
        </p>
      ) : (
        <p className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
          Optional for this account type. Record it if the customer has one.
        </p>
      )}

      {/* ---------------------------------------------------------- the bank */}
      <section className="space-y-4 rounded-lg border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Landmark className="size-4 text-muted-foreground" aria-hidden />
          Bank account
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Bank">
            <Combobox
              id="bankId"
              value={bankId || null}
              onChange={(v) => {
                setValue("bankId", v ?? "");
                /* The nested block carries the NAME, because that is what the
                   API stores on the bank-details record; the id is the
                   searchable reference. Kept in step so the review page and
                   the saved record cannot disagree about which bank it is. */
                setBank("bankName", banks.find((b) => b.id === v)?.name ?? "");
              }}
              options={asOptions(banks)}
              placeholder="Select bank"
              emptyMessage="No banks are configured."
            />
          </Field>

          <Field
            label="Account number"
            required={profile.requiresBankAccount}
            error={
              /* Laravel reports this as `bankDetails.accountNumber`; RHF stores
                 it at the same dotted path, so it lands on this input. */
              (errors.bankDetails as { accountNumber?: { message?: string } } | undefined)
                ?.accountNumber?.message
            }
          >
            <Input
              id="bankDetails.accountNumber"
              value={bankDetails?.accountNumber ?? ""}
              onChange={(e) => setBank("accountNumber", e.target.value)}
            />
          </Field>

          <Field label="Account name">
            <Input
              id="bankDetails.accountName"
              value={bankDetails?.accountName ?? ""}
              onChange={(e) => setBank("accountName", e.target.value)}
            />
          </Field>

          <Field label="Bank branch" error={errors.bankBranch?.message}>
            <Input id="bankBranch" {...register("bankBranch")} />
          </Field>
        </div>
      </section>

      {/* ------------------------------------------------------ mobile money */}
      <section className="space-y-4 rounded-lg border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Smartphone className="size-4 text-muted-foreground" aria-hidden />
          Mobile money
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Provider">
            <Combobox
              id="mobileMoneyProviderId"
              value={watch("mobileMoneyProviderId") || null}
              onChange={(v) => {
                setValue("mobileMoneyProviderId", v ?? "");
                setValue(
                  "mobileMoneyProvider",
                  mobileMoneyProviders.find((p) => p.id === v)?.name ?? ""
                );
              }}
              options={asOptions(mobileMoneyProviders)}
              placeholder="Select provider"
              emptyMessage="No providers are configured."
            />
          </Field>
          <Field label="Wallet number" error={errors.walletNumber?.message}>
            <Input id="walletNumber" placeholder="0754000000" {...register("walletNumber")} />
          </Field>
        </div>
      </section>

      {/* -------------------------------------------------------------- card */}
      {/* Rendered when the account type asks for it, and whenever something has
          already been typed into it — so switching account type never silently
          discards what the officer entered. */}
      {(profile.requiresCardDetails || watch("cardNumber")) && (
        <section className="space-y-4 rounded-lg border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="size-4 text-muted-foreground" aria-hidden />
            Bank card
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Account name" error={errors.accountName?.message}>
              <Input id="accountName" {...register("accountName")} />
            </Field>
            <Field
              label="Card number"
              required={profile.requiresCardDetails}
              error={errors.cardNumber?.message}
            >
              <Input id="cardNumber" inputMode="numeric" autoComplete="off" {...register("cardNumber")} />
              <p className="text-[11px] text-muted-foreground">
                Not stored. Only the last four digits are kept.
              </p>
            </Field>
            <Field
              label="Expiration"
              error={errors.cardExpiryMonth?.message ?? errors.cardExpiryYear?.message}
            >
              <div className="flex items-center gap-2">
                <Input
                  id="cardExpiryMonth"
                  placeholder="month"
                  type="number"
                  min="1"
                  max="12"
                  {...register("cardExpiryMonth", {
                    setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                  })}
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  id="cardExpiryYear"
                  placeholder="year"
                  type="number"
                  min="2020"
                  max="2099"
                  {...register("cardExpiryYear", {
                    setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                  })}
                />
              </div>
            </Field>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}:{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
