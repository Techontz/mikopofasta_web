import Link from "next/link";
import { BadgeCheck, CircleAlert, CircleDashed, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { KycStatusResult } from "@/lib/api/customers";
import type { KycRequirement, RegistrationStage } from "@/types/customer";

/**
 * Renders `GET /customers/{customer}/kyc-status` rather than recomputing the
 * checklist here.
 *
 * The server is the only party that can answer it: whether a line is required
 * depends on the customer's account type, and whether a NIDA check is even
 * possible depends on the deployment. Recomputing either in the browser would
 * produce a second opinion that disagrees with the one the loan gate uses.
 *
 * FOUR STATES, NOT TWO. The old panel showed five fixed items as ticked or
 * unticked, which could not distinguish:
 *
 *   done · outstanding · not required for this customer ·
 *   required but impossible in this deployment
 *
 * The last is the NIDA and SMS case, and it matters most: an officer told only
 * "NIDA verified ✗" will keep trying to fix something that is not theirs to
 * fix. It is labelled as a configuration problem, because that is what it is.
 */

const STAGE_TONE: Record<RegistrationStage, string> = {
  draft: "border-muted-foreground/30 bg-muted",
  information_incomplete: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  awaiting_face_verification: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  not_eligible: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  loan_eligible: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export function KycChecklistPanel({
  kyc,
  customerId,
}: {
  kyc: KycStatusResult;
  customerId: string;
}) {
  /* Progress counts only what applies to this customer. Including items their
     account type does not require would show a savings customer stuck at 60%
     for questions nobody is going to ask them. */
  const applicable = kyc.requirements.filter((r) => r.required);
  const done = applicable.filter((r) => r.satisfied).length;
  const progress = applicable.length === 0 ? 100 : Math.round((done / applicable.length) * 100);

  const { progress: stage } = kyc;

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------- where they are */}
      <div className={`space-y-1 rounded-lg border p-3 ${STAGE_TONE[stage.stage]}`}>
        <p className="text-sm font-medium">{stage.label}</p>
        {stage.nextAction && <p className="text-xs opacity-90">{stage.nextAction}</p>}
      </div>

      {/*
        The action for the stage that has one. Face verification is reachable
        from here, from the profile's own Face Verification tab, and from any
        other signed-in device — nothing about it depends on the session that
        registered the customer.
      */}
      {stage.stage === "awaiting_face_verification" && (
        <Button
          size="sm"
          className="w-full"
          nativeButton={false}
          render={<Link href={`/customers/${customerId}?tab=face`}>Complete face verification</Link>}
        />
      )}

      {stage.stage === "loan_eligible" && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={<Link href={`/loans/new?customerId=${customerId}`}>Start loan application</Link>}
        />
      )}

      {/* -------------------------------------------------------------- progress */}
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

      {/* ------------------------------------------------------------ the items */}
      <ul className="space-y-2">
        {kyc.requirements.map((item) => (
          <RequirementRow key={item.key} item={item} />
        ))}
      </ul>

      {kyc.missingDocuments.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Outstanding documents for this category: {kyc.missingDocuments.join(", ")}.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Overall status:{" "}
        <span className="font-medium capitalize text-foreground">{kyc.kycStatus}</span>
        {!kyc.isLoanEligible && " — this customer cannot yet apply for a loan."}
      </p>
    </div>
  );
}

function RequirementRow({ item }: { item: KycRequirement }) {
  const { icon, tone } = presentation(item);

  return (
    <li className="flex items-start gap-2 text-sm">
      {icon}
      <span className="min-w-0">
        <span className={tone}>
          {item.label}
          {!item.required && !item.satisfied && (
            <span className="ml-1 text-xs text-muted-foreground">(not required)</span>
          )}
        </span>
        {item.detail && <span className="block text-xs text-muted-foreground">{item.detail}</span>}
        {item.blocked && (
          <span className="block text-xs text-destructive">
            Required by this account type, but the integration is not available. An administrator
            must turn the requirement off or connect it — this is not something the branch can
            resolve.
          </span>
        )}
      </span>
    </li>
  );
}

function presentation(item: KycRequirement): { icon: React.ReactNode; tone: string } {
  if (item.satisfied) {
    return {
      icon: <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />,
      tone: "",
    };
  }

  if (item.blocked) {
    return {
      icon: <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />,
      tone: "text-destructive",
    };
  }

  if (item.required) {
    return {
      icon: <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />,
      tone: "text-foreground",
    };
  }

  /* Not required and not done. Shown, because "we did not ask" is a fact worth
     recording, but greyed so it does not read as an outstanding task. */
  return {
    icon: <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" aria-hidden />,
    tone: "text-muted-foreground",
  };
}
