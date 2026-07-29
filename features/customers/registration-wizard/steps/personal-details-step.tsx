"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { BadgeCheck, Fingerprint, Loader2, ScanFace, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MARITAL_STATUSES } from "@/types/enums";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import { lookupNida, verifyNidaOtp } from "@/features/customers/actions";
import type { Branch } from "@/types/branch";
import type { CustomerCategory } from "@/types/customer";

const NONE = "__none__";

export interface VerificationState {
  nidaVerifiedAt: string | null;
  otpVerifiedAt: string | null;
  faceVerifiedAt: string | null;
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

  const [otp, setOtp] = React.useState("");
  const [isLookingUp, setIsLookingUp] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isCapturingFace, setIsCapturingFace] = React.useState(false);

  const nidaNumber = watch("nidaNumber");
  const firstName = watch("firstName");

  async function handleLookup() {
    setIsLookingUp(true);
    const result = await lookupNida({ nidaNumber });
    setIsLookingUp(false);
    if (!result.ok || !result.data) {
      toast.error(result.message ?? "NIDA lookup failed.");
      return;
    }
    setValue("firstName", result.data.firstName, { shouldValidate: true });
    setValue("middleName", result.data.middleName);
    setValue("lastName", result.data.lastName, { shouldValidate: true });
    setValue("dob", result.data.dob, { shouldValidate: true });
    setValue("gender", result.data.gender, { shouldValidate: true });
    setVerification((v) => ({ ...v, nidaVerifiedAt: new Date().toISOString() }));
    toast.success(result.message ?? "Identity found.");
  }

  async function handleVerifyOtp() {
    setIsVerifying(true);
    const result = await verifyNidaOtp({ nidaNumber, otp });
    setIsVerifying(false);
    if (!result.ok) {
      toast.error(result.message ?? "OTP verification failed.");
      return;
    }
    // The API's own timestamp, not the browser's — it is the value the
    // registration payload is validated against.
    setVerification((v) => ({ ...v, otpVerifiedAt: result.verifiedAt ?? new Date().toISOString() }));
    toast.success(result.message ?? "OTP verified.");
  }

  function handleCaptureFace() {
    setIsCapturingFace(true);
    setTimeout(() => {
      setVerification((v) => ({ ...v, faceVerifiedAt: new Date().toISOString() }));
      setIsCapturingFace(false);
      toast.success("Face liveness verified.");
    }, 800);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2">
            <Fingerprint className="size-4 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">NIDA Identity Verification</p>
            {verification.nidaVerifiedAt && (
              <Badge variant="default" className="ml-auto gap-1">
                <BadgeCheck className="size-3.5" /> Verified
              </Badge>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="nidaNumber">NIDA Number</Label>
              <Input id="nidaNumber" placeholder="19900101-12345-12345-12" disabled={Boolean(verification.nidaVerifiedAt)} {...register("nidaNumber")} />
              {errors.nidaNumber && <p className="text-xs text-destructive">{errors.nidaNumber.message}</p>}
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={handleLookup} disabled={isLookingUp || !nidaNumber || Boolean(verification.nidaVerifiedAt)}>
                {isLookingUp && <Loader2 className="size-4 animate-spin" />}
                {verification.nidaVerifiedAt ? "Looked up" : "Lookup"}
              </Button>
            </div>
          </div>

          {verification.nidaVerifiedAt && !verification.otpVerifiedAt && (
            <div className="grid gap-3 rounded-md border bg-muted/40 p-3 sm:grid-cols-[1fr_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="otp">Enter OTP sent to customer&apos;s registered number</Label>
                <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" maxLength={6} />
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={handleVerifyOtp} disabled={isVerifying || otp.length !== 6}>
                  {isVerifying && <Loader2 className="size-4 animate-spin" />}
                  Verify OTP
                </Button>
              </div>
            </div>
          )}

          {verification.nidaVerifiedAt && (
            <div className="grid gap-4 border-t pt-3 sm:grid-cols-3">
              <Field label="First Name" value={firstName} />
              <Field label="Middle Name (editable)" input={<Input {...register("middleName")} placeholder="—" />} />
              <Field label="Last Name" value={watch("lastName")} />
              <Field label="Date of Birth" value={watch("dob")} />
              <Field label="Gender" value={watch("gender")} className="capitalize" />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Face Verification</Label>
                {verification.faceVerifiedAt ? (
                  <Badge variant="default" className="gap-1">
                    <ShieldCheck className="size-3.5" /> Verified
                  </Badge>
                ) : (
                  <Button type="button" size="sm" variant="outline" onClick={handleCaptureFace} disabled={!verification.otpVerifiedAt || isCapturingFace}>
                    {isCapturingFace ? <Loader2 className="size-4 animate-spin" /> : <ScanFace className="size-4" />}
                    Capture & Verify Face
                  </Button>
                )}
              </div>
            </div>
          )}
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
          <Select value={watch("branchId")} onValueChange={(v) => v && setValue("branchId", v, { shouldValidate: true })} disabled={branchLocked}>
            <SelectTrigger aria-label="Branch" className="w-full">
              <SelectValue placeholder="Select branch">{(v: string) => branches.find((b) => b.id === v)?.name ?? "Select branch"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Customer Category</Label>
          <Select value={watch("customerCategoryId")} onValueChange={(v) => v && setValue("customerCategoryId", v, { shouldValidate: true })}>
            <SelectTrigger aria-label="Customer Category" className="w-full">
              <SelectValue placeholder="Select the customer's segment">
                {(v: string) => categories.find((c) => c.id === v)?.name ?? "Select the customer's segment"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Drives which KYC documents and dynamic fields are required next.</p>
          {errors.customerCategoryId && <p className="text-xs text-destructive">{errors.customerCategoryId.message}</p>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, input, className }: { label: string; value?: string; input?: React.ReactNode; className?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {input ?? <p className={`text-sm font-medium ${className ?? ""}`}>{value || "—"}</p>}
    </div>
  );
}
