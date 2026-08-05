"use client";

import { useFormContext } from "react-hook-form";
import { BadgeCheck, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { VerificationState } from "@/features/customers/registration-wizard/steps/personal-details-step";
import type { Branch, Region } from "@/types/branch";
import type { CustomerCategory } from "@/types/customer";

export function ReviewStep({
  verification,
  branches,
  regions,
  categories,
}: {
  verification: VerificationState;
  branches: Branch[];
  regions: Region[];
  categories: CustomerCategory[];
}) {
  const { watch } = useFormContext<WizardValues>();
  const values = watch();
  const branch = branches.find((b) => b.id === values.branchId);
  const region = regions.find((r) => r.id === values.regionId);
  const category = categories.find((c) => c.id === values.customerCategoryId);

  const checklist = [
    { label: "Face liveness verified", done: Boolean(verification.faceVerifiedAt) },
    { label: "Category assigned", done: Boolean(values.customerCategoryId) },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-lg border p-3">
        <p className="mb-2 text-sm font-medium">KYC Checklist</p>
        <div className="flex flex-wrap gap-2">
          {checklist.map((item) => (
            <Badge key={item.label} variant={item.done ? "default" : "secondary"} className="gap-1">
              {item.done ? <BadgeCheck className="size-3.5" /> : <CircleAlert className="size-3.5" />}
              {item.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Summary label="Full Name" value={[values.firstName, values.middleName, values.lastName].filter(Boolean).join(" ")} />
        <Summary label="National ID" value={values.nidaNumber || "Not provided"} />
        <Summary label="Phone" value={values.phone} />
        <Summary label="Gender / DOB" value={`${values.gender}, ${values.dob}`} />
        <Summary label="Marital Status" value={values.maritalStatus ?? "—"} />
        <Summary label="Branch" value={branch?.name ?? "—"} />
        <Summary label="Category" value={category?.name ?? "—"} />
        <Summary label="Region" value={region?.name ?? "—"} />
        <Summary label="Residence Type" value={values.residenceType ?? "—"} />
        <Summary label="Bank Details" value={values.bankDetails ? `${values.bankDetails.bankName} — ${values.bankDetails.accountNumber}` : "Not provided"} />
        <Summary label="Guarantors" value={String(values.guarantors.length)} />
        <Summary label="Next of Kin" value={String(values.nextOfKin.length)} />
      </div>

      {category?.requiresExtraApproval && (
        <>
          <Separator />
          <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            <CircleAlert className="size-4 shrink-0" />
            This category requires extra approval — the customer will be marked &quot;Pending Approval&quot; after submission.
          </div>
        </>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium capitalize">{value || "—"}</p>
    </div>
  );
}
