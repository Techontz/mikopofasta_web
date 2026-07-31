"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  error: unknown;
  reset?: () => void;
  className?: string;
}

/**
 * Renders the human-worded copy for a known ApiError.errorCode (§9 of the
 * frontend spec), falling back to a generic message — never a raw stack
 * trace or JSON blob in front of a user.
 */
export function ErrorState({ error, reset, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3.5 rounded-lg border border-dashed px-6 py-12 text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" strokeWidth={1.7} aria-hidden />
      </div>
      <div className="space-y-1.5">
        <h3 className="st-empty-title text-[14px] font-semibold tracking-[-0.01em]">Something went wrong</h3>
        <p className="st-empty-text mx-auto max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          {describeError(error)}
        </p>
      </div>
      {reset && (
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCw className="size-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
