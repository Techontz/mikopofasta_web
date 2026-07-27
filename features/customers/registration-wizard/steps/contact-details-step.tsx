"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";

export function ContactDetailsStep() {
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
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" placeholder="0754000000" {...register("phone")} />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="space-y-3 rounded-lg border p-3">
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
