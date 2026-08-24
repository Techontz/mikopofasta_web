import Link from "next/link";
import { BadgeCheck, CircleAlert, ScanFace, ShieldQuestion, Stamp, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RegistrationProgress, RegistrationStage } from "@/types/customer";

/**
 * Where this registration stands, on the first screen of the profile.
 *
 * The header beside it already shows `kycStatus`, which is a two-valued
 * column: a customer missing their district and a customer who has only the
 * face scan left both read `incomplete`. Those are entirely different
 * situations needing different actions from different people, and telling them
 * apart is the whole reason `RegistrationProgress` exists on the API.
 *
 * `nextAction` is rendered verbatim rather than re-worded per screen. The same
 * sentence appears here, in the KYC tab and in the wizard, because three
 * paraphrases of one instruction is how a workflow stops being one workflow.
 */

const PRESENTATION: Record<
  RegistrationStage,
  { tone: string; icon: typeof BadgeCheck }
> = {
  draft: { tone: "border-muted-foreground/30 bg-muted", icon: ShieldQuestion },
  information_incomplete: {
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: CircleAlert,
  },
  awaiting_face_verification: {
    tone: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
    icon: ScanFace,
  },
  /* Waiting on a person, not on the officer — indigo rather than amber, so it
     does not read as something the branch has failed to do. */
  awaiting_registration_approval: {
    tone: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    icon: Stamp,
  },
  registration_rejected: {
    tone: "border-destructive/40 bg-destructive/10 text-destructive",
    icon: Undo2,
  },
  not_eligible: {
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: CircleAlert,
  },
  loan_eligible: {
    tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: BadgeCheck,
  },
};

export function RegistrationStageBanner({
  progress,
  customerId,
}: {
  progress: RegistrationProgress;
  customerId: string;
}) {
  const { tone, icon: Icon } = PRESENTATION[progress.stage];

  return (
    <div className={`flex flex-wrap items-start gap-3 rounded-lg border p-3 ${tone}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />

      <div className="min-w-40 flex-1 space-y-1">
        <p className="text-sm font-medium">{progress.label}</p>
        {progress.nextAction && <p className="text-xs opacity-90">{progress.nextAction}</p>}

        {/* What is actually missing, not just that something is. */}
        {progress.outstanding.length > 0 && progress.stage === "information_incomplete" && (
          <ul className="ml-4 list-disc text-xs opacity-90">
            {progress.outstanding.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      {progress.stage === "awaiting_face_verification" && (
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={`/customers/${customerId}?tab=face`}>Verify face</Link>}
        />
      )}

      {progress.stage === "loan_eligible" && (
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/loans/new?customerId=${customerId}`}>Start loan application</Link>}
        />
      )}
    </div>
  );
}
