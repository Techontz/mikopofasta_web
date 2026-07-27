import { BadgeCheck, CircleAlert } from "lucide-react";
import { getKycChecklist, type Customer } from "@/types/customer";

const LABELS: Record<keyof ReturnType<typeof getKycChecklist>, string> = {
  nidaVerified: "NIDA identity verified",
  otpVerified: "OTP verified",
  faceVerified: "Face liveness verified",
  additionalDataComplete: "Bank details, marital status & address on file",
  categoryAssigned: "Customer category assigned",
};

export function KycChecklistPanel({ customer, hasBankDetails }: { customer: Customer; hasBankDetails: boolean }) {
  const checklist = getKycChecklist(customer, hasBankDetails);
  const entries = Object.entries(checklist) as [keyof typeof checklist, boolean][];
  const doneCount = entries.filter(([, done]) => done).length;
  const progress = Math.round((doneCount / entries.length) * 100);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">KYC Progress</span>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ul className="space-y-2">
        {entries.map(([key, done]) => (
          <li key={key} className="flex items-center gap-2 text-sm">
            {done ? <BadgeCheck className="size-4 text-primary" aria-hidden /> : <CircleAlert className="size-4 text-muted-foreground" aria-hidden />}
            <span className={done ? "" : "text-muted-foreground"}>{LABELS[key]}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Overall status: <span className="font-medium capitalize text-foreground">{customer.kycStatus}</span>
        {customer.kycStatus !== "completed" && " — this customer cannot yet apply for a loan."}
      </p>
    </div>
  );
}
