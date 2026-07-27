"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/feedback/error-state";

/**
 * Error boundary for the dashboard segment. Scoped here rather than relying
 * on the root boundary alone so a failure inside one module keeps the shell
 * — sidebar, header, navigation — intact and recoverable.
 */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // In production this reports to an error-tracking service instead.
    console.error(error);
  }, [error]);

  return <ErrorState error={error} reset={reset} className="mx-auto max-w-md" />;
}
