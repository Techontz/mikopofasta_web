import { Banknote, History, ShieldCheck, Signal, Workflow } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import type { LoanTimelineEvent } from "@/lib/domain/loan-timeline";

const ICONS: Record<LoanTimelineEvent["kind"], typeof History> = {
  status: Workflow,
  mandate: ShieldCheck,
  telco: Signal,
  disbursement: Banknote,
  decision: History,
};

export function LoanTimelinePanel({ events, actorNames }: { events: LoanTimelineEvent[]; actorNames: Record<string, string> }) {
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
              <p className="text-xs text-muted-foreground">
                {new Date(event.at).toLocaleString()}
                {event.actorId && ` · ${actorNames[event.actorId] ?? event.actorId}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
