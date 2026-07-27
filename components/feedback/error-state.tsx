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
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center",
        className
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" aria-hidden />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Something went wrong</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{describeError(error)}</p>
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
