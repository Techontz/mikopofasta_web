import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Shared empty-state primitive — every list/table in every module renders
 * its own copy through this one component (per "every feature must be
 * reusable, do not duplicate components").
 *
 * The `st-empty` hooks are inert on the default surface. They exist so that
 * when this renders inside a `.st-scope` table, globals.css can recolour it
 * from the configuration tokens without a second component or a variant prop
 * threaded down through DataTable.
 */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 py-14 text-center",
        className
      )}
    >
      <div className="st-empty-icon flex size-14 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" strokeWidth={1.7} aria-hidden />
      </div>
      <div className="space-y-1.5">
        <h3 className="st-empty-title text-[17px] font-semibold tracking-[-0.012em]">{title}</h3>
        {description && (
          <p className="st-empty-text mx-auto max-w-sm text-[14px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
