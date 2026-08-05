"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { GENDERS, MARITAL_STATUSES } from "@/types/enums";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { Branch } from "@/types/branch";
import type { CustomerCategory } from "@/types/customer";
import { Combobox } from "@/components/settings/combobox";
import { FaceCapture } from "@/features/customers/registration-wizard/face-capture";
import { activeIdentityProvider } from "@/features/customers/identity/active-provider";

const NONE = "__none__";

export interface VerificationState {
  faceVerifiedAt: string | null;
  /**
   * The liveness image itself, held until the customer exists.
   *
   * `POST /customers/{id}/face-verify` needs a customer id, and during
   * registration there is not one yet — the customer is created by the call
   * that this verification is a precondition of. So the capture is held here
   * and posted by the wizard the moment registration returns an id.
   *
   * It is what makes `faceVerifiedAt` mean something: the timestamp is only
   * ever set alongside a real file, and the file is only ever set by the
   * officer choosing one.
   */
  faceCapture: File | null;
}

export function PersonalDetailsStep({
  branches,
  branchLocked,
  categories,
  verification,
  setVerification,
}: {
  branches: Branch[];
  branchLocked: boolean;
  categories: CustomerCategory[];
  verification: VerificationState;
  setVerification: React.Dispatch<React.SetStateAction<VerificationState>>;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();



  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/*
            Identity, entered by the officer.

            This block used to be a NIDA lookup and an OTP step. Both were
            served by `NidaRegistry` on the API, which generated a name, a date
            of birth and a gender from a hash of whatever number was typed — so
            the "Verified" badge, the OTP field and the read-only identity
            fields were all reporting on a check that never happened.

            There is no registry to call, so the fields are typed and nothing
            claims otherwise. `activeIdentityProvider` decides this: the day a
            real NIDA provider is assigned, `supportsLookup` turns the lookup
            control back on and `identityIsUserEntered` makes these read-only
            again, without this file changing.
          */}
          <div className="flex items-center gap-2">
            <UserRound className="size-4 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">Customer Identity</p>
            <span className="ml-auto text-xs text-muted-foreground">
              {activeIdentityProvider.label}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input id="firstName" placeholder="First name" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input id="middleName" placeholder="Middle name" {...register("middleName")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lastName">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input id="lastName" placeholder="Last name" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dob">
                Date of Birth <span className="text-destructive">*</span>
              </Label>
              <Input id="dob" type="date" {...register("dob")} />
              {errors.dob && <p className="text-xs text-destructive">{errors.dob.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>
                Gender <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch("gender") ?? ""}
                onValueChange={(v) => v && setValue("gender", v as WizardValues["gender"], { shouldValidate: true })}
              >
                <SelectTrigger aria-label="Gender" className="w-full">
                  <SelectValue placeholder="Select gender">
                    {(v: string) => v || "Select gender"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g} className="capitalize">
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
            </div>

            {/*
              Optional, and labelled so. Many customers of a Tanzanian
              microfinance institution do not carry a National ID; the API
              accepts the record without one and rates its KYC `incomplete`,
              which is the accurate description of a record nothing verified.
            */}
            {/*
              Writes `nationalIdNumber`, NOT `nidaNumber`.
              
              `nidaNumber` is the NIDA registry's own identifier and the API
              pairs it with `nidaVerifiedAt` — supply one and you must supply
              the other, because an ID from the registry without the check that
              produced it is exactly the fabricated verification this flow was
              built to end. A number the officer reads off a card is not that:
              nothing verified it, so it belongs in the plain column.
              
              Sending it as `nidaNumber` made registration impossible — the
              manual provider correctly reports no verification timestamp, so
              typing an ID guaranteed a 422 on a field the form never showed.
            */}
            <div className="space-y-1.5">
              <Label htmlFor="nationalIdNumber">National ID Number</Label>
              <Input
                id="nationalIdNumber"
                placeholder="Optional"
                {...register("nationalIdNumber")}
              />
              {errors.nationalIdNumber && (
                <p className="text-xs text-destructive">{errors.nationalIdNumber.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm font-medium">Face Capture</p>
          <p className="text-xs text-muted-foreground">
            Becomes the customer&rsquo;s photo. Not checked against any registry — there is none to
            check against — so this records who was present, it does not prove who they are.
          </p>
          <FaceCapture
            capture={verification.faceCapture}
            onCapture={(file) =>
              setVerification((v) => ({
                ...v,
                faceVerifiedAt: new Date().toISOString(),
                faceCapture: file,
              }))
            }
            onClear={() => setVerification((v) => ({ ...v, faceVerifiedAt: null, faceCapture: null }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Marital Status</Label>
          <Select
            value={watch("maritalStatus") ?? NONE}
            onValueChange={(v) => setValue("maritalStatus", v === NONE ? null : (v as WizardValues["maritalStatus"]), { shouldValidate: true })}
          >
            <SelectTrigger aria-label="Marital Status" className="w-full">
              <SelectValue placeholder="Select marital status">{(v: string) => (v === NONE ? "Select marital status" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE} className="text-muted-foreground">
                Select marital status
              </SelectItem>
              {MARITAL_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.maritalStatus && <p className="text-xs text-destructive">{errors.maritalStatus.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Branch</Label>
          {/* Searchable: an institution with forty branches is a list you
              type into, not one you scroll. */}
          <Combobox
            id="reg-branch"
            value={watch("branchId") || null}
            onChange={(v) => v && setValue("branchId", v, { shouldValidate: true })}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
            disabled={branchLocked}
            disabledMessage="Fixed to your branch"
            placeholder="Search branch…"
            emptyMessage="No branches are configured."
            invalid={!!errors.branchId}
          />
          {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Customer Category</Label>
          <Combobox
            id="reg-category"
            value={watch("customerCategoryId") || null}
            onChange={(v) => v && setValue("customerCategoryId", v, { shouldValidate: true })}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Search the customer's segment…"
            emptyMessage="No customer categories are configured."
            invalid={!!errors.customerCategoryId}
          />
          <p className="text-xs text-muted-foreground">Drives which KYC documents and dynamic fields are required next.</p>
          {errors.customerCategoryId && <p className="text-xs text-destructive">{errors.customerCategoryId.message}</p>}
        </div>
      </div>
    </div>
  );
}

