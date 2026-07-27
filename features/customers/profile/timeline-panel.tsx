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

export function TimelinePanel({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <EmptyState icon={History} title="No timeline events yet" />;
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => {
        const Icon = ICONS[event.kind];
        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <div className="space-y-0.5 pb-1">
              <p className="text-sm font-medium">{event.title}</p>
              {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
              <p className="text-xs text-muted-foreground">{new Date(event.at).toLocaleString()}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
