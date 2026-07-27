import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LOAN_STATUS_LABELS, LOAN_STATUS_TONE } from "@/lib/domain/loan-status-machine";
import type { LoanStatus } from "@/types/enums";

const TONE_CLASS: Record<string, string> = {
  neutral: "",
  progress: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  bad: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  const tone = LOAN_STATUS_TONE[status];
  return (
    <Badge variant={tone === "neutral" ? "secondary" : "outline"} className={cn("whitespace-nowrap", TONE_CLASS[tone])}>
      {LOAN_STATUS_LABELS[status]}
    </Badge>
  );
}
