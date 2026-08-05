import { BadgeCheck, FileText, History, MessageSquare, ShieldAlert, ShieldCheck, UserRoundPlus } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import type { TimelineEvent } from "@/lib/domain/customer-timeline";

const ICONS: Record<TimelineEvent["kind"], typeof History> = {
  registration: UserRoundPlus,
  kyc: ShieldCheck,
  document: FileText,
  note: MessageSquare,
  status: ShieldAlert,
  approval: BadgeCheck,
  audit: History,
};

/**
 * The customer's history.
 *
 * `actorId` has been on every event since the timeline was written and was
 * never rendered, so the panel could say a customer had been suspended but not
 * by whom — which is the second thing anybody asks and the only one that makes
 * the entry accountable. `staff` resolves the id to a name.
 *
 * Audit actions arrive as the stored vocabulary (`CUSTOMER_FACE_SCANNED`).
 * They are title-cased for reading rather than mapped through a lookup: the
 * backend's vocabulary is extensible by design, and a map would silently
 * render new actions as blanks.
 */
export function TimelinePanel({
  events,
  staff = {},
}: {
  events: TimelineEvent[];
  /** User id → display name, for the actor line. */
  staff?: Record<string, string>;
}) {
  if (events.length === 0) {
    return <EmptyState icon={History} title="No timeline events yet" />;
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => {
        const Icon = ICONS[event.kind];
        const actor = event.actorId ? staff[event.actorId] : null;

        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <div className="space-y-0.5 pb-1">
              <p className="text-sm font-medium">
                {event.kind === "audit" ? readable(event.title) : event.title}
              </p>
              {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
              <p className="text-xs text-muted-foreground">
                {new Date(event.at).toLocaleString()}
                {/* Named where known. A deleted user leaves an id behind, and
                    "by user 12" is still more than nothing. */}
                {actor ? ` · ${actor}` : event.actorId ? ` · user ${event.actorId}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * CUSTOMER_FACE_SCANNED → "Customer face scanned".
 *
 * Acronyms are restored afterwards: lower-casing the whole string turns KYC
 * and NIDA into "kyc" and "nida", which reads as a typo rather than as the
 * things they are.
 */
const ACRONYMS = ["kyc", "nida", "otp", "id", "tin", "hq", "sms"];

function readable(action: string): string {
  const words = action.toLowerCase().replace(/_/g, " ").trim().split(" ");

  return words
    .map((word, i) =>
      ACRONYMS.includes(word)
        ? word.toUpperCase()
        : i === 0
          ? word.charAt(0).toUpperCase() + word.slice(1)
          : word
    )
    .join(" ");
}
