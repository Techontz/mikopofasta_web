"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { AlarmClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runOverdueProcess } from "@/features/repayments/actions";

export function OverdueRunButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await runOverdueProcess();
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <AlarmClock className="size-4" />}
      Run Overdue / Penalty Process
    </Button>
  );
}
