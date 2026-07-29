import { BadgeCheck, CircleAlert } from "lucide-react";
import type { KycChecklist } from "@/types/customer";
import type { KycStatusResult } from "@/lib/api/customers";

const LABELS: Record<keyof KycChecklist, string> = {
  nidaVerified: "NIDA identity verified",
  otpVerified: "OTP verified",
  faceVerified: "Face liveness verified",
  additionalDataComplete: "Bank details, marital status & address on file",
  categoryAssigned: "Customer category assigned",
};

const ORDER: (keyof KycChecklist)[] = [
  "nidaVerified",
  "otpVerified",
  "faceVerified",
  "additionalDataComplete",
  "categoryAssigned",
];

/**
 * Renders `GET /customers/{customer}/kyc-status` rather than recomputing the
 * checklist here.
 *
 * The server is the only party that can answer it: `additionalDataComplete`
 * turns on whether a bank record exists, and this API never returns one — it
 * accepts bank details on write and reports the conclusion, not the data.
 * Asking the endpoint also keeps `missingDocuments` and loan eligibility
 * consistent with whatever the backend decides they mean.
 */
export function KycChecklistPanel({ kyc }: { kyc: KycStatusResult }) {
  const doneCount = ORDER.filter((key) => kyc.checklist[key]).length;
  const progress = Math.round((doneCount / ORDER.length) * 100);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">KYC Progress</span>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="KYC progress"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ul className="space-y-2">
        {ORDER.map((key) => {
          const done = kyc.checklist[key];
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              {done ? <BadgeCheck className="size-4 text-primary" aria-hidden /> : <CircleAlert className="size-4 text-muted-foreground" aria-hidden />}
              <span className={done ? "" : "text-muted-foreground"}>{LABELS[key]}</span>
            </li>
          );
        })}
      </ul>

      {kyc.missingDocuments.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Outstanding documents for this category: {kyc.missingDocuments.join(", ")}.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Overall status: <span className="font-medium capitalize text-foreground">{kyc.kycStatus}</span>
        {!kyc.isLoanEligible && " — this customer cannot yet apply for a loan."}
      </p>
    </div>
  );
}
