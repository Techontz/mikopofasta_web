import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AccessDeniedStateProps {
  title?: string;
  description?: string;
}

/** Shared by app/forbidden.tsx, app/unauthorized.tsx, and /access-denied. */
export function AccessDeniedState({
  title = "You don't have access to this page",
  description = "Your role doesn't include the permission required here. Contact an administrator if you believe this is a mistake.",
}: AccessDeniedStateProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="size-7 text-destructive" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <Button nativeButton={false} render={<Link href="/dashboard">Back to Dashboard</Link>} />
    </div>
  );
}
