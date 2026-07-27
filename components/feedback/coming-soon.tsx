import { Construction } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";

/**
 * Placeholder for modules not yet built. Every stub route in Phase 1 renders
 * this single shared component — proves the shell/nav/RBAC wiring end-to-end
 * without introducing any business logic ahead of its phase.
 */
export function ComingSoon({ module }: { module: string }) {
  return (
    <EmptyState
      icon={Construction}
      title={`${module} is coming in a later phase`}
      description="This module's navigation, routing, and access control are already wired up — the business logic lands in its dedicated implementation phase."
      className="min-h-[60vh]"
    />
  );
}
