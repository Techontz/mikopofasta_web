"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";

/**
 * Phone and bank details, which now render on different steps.
 *
 * The legacy form puts the phone number with the basic information and the
 * bank block on its own step beside the passport photo. Rather than split this
 * into two components — duplicating the RHF wiring for a shared `bankDetails`
 * object — the same component renders either half.
 *
 * Neither flag renders both, and no flag renders both: the default is unchanged
 * for anything still calling this without props.
 */
export function ContactDetailsStep({
  hideBank,
  bankOnly,
}: {
  /** Phone only — the Basic Information step. */
  hideBank?: boolean;
  /** Bank block only — the Passport & Bank step. */
  bankOnly?: boolean;
} = {}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const bankDetails = watch("bankDetails");
  const hasBankDetails = bankDetails !== null;

  return (
    <div className="space-y-5">
      {!bankOnly && (
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" placeholder="0754000000" {...register("phone")} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
      )}

      <div className={`space-y-3 rounded-lg border p-3 ${hideBank ? "hidden" : ""}`}>
        <div className="flex items-center gap-2">
          <Checkbox
            id="has-bank"
            checked={hasBankDetails}
            onCheckedChange={(checked) =>
              setValue(
                "bankDetails",
                checked === true ? { bankName: "", accountNumber: "", accountName: "", phoneNumber: null } : null
              )
            }
          />
          <Label htmlFor="has-bank" className="font-normal">
            Customer has bank details to record
          </Label>
        </div>

        {hasBankDetails && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input id="bankName" {...register("bankDetails.bankName")} />
              {errors.bankDetails?.bankName && <p className="text-xs text-destructive">{errors.bankDetails.bankName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input id="accountNumber" {...register("bankDetails.accountNumber")} />
              {errors.bankDetails?.accountNumber && <p className="text-xs text-destructive">{errors.bankDetails.accountNumber.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountName">Account Name</Label>
              <Input id="accountName" {...register("bankDetails.accountName")} />
              {errors.bankDetails?.accountName && <p className="text-xs text-destructive">{errors.bankDetails.accountName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bankPhone">Mobile Number Linked to Account</Label>
              <Input id="bankPhone" {...register("bankDetails.phoneNumber")} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
