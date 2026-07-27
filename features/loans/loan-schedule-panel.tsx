import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatMoney } from "@/lib/domain/money";
import { scheduleOutstanding, type LoanSchedule } from "@/types/loan";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  partial: "secondary",
  paid: "default",
  overdue: "destructive",
};

export function LoanSchedulePanel({ schedules }: { schedules: LoanSchedule[] }) {
  if (schedules.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No repayment schedule yet"
        description="The installment plan is generated when a manager approves the application."
      />
    );
  }

  const sorted = [...schedules].sort((a, b) => a.installmentNumber - b.installmentNumber);
  const totals = sorted.reduce(
    (acc, s) => ({
      due: acc.due + s.principalDue + s.interestDue + s.penaltyDue,
      paid: acc.paid + s.principalPaid + s.interestPaid + s.penaltyPaid,
    }),
    { due: 0, paid: 0 }
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Fact label="Total due" value={formatMoney(totals.due)} />
        <Fact label="Total paid" value={formatMoney(totals.paid)} />
        <Fact label="Outstanding" value={formatMoney(totals.due - totals.paid)} />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Principal</TableHead>
              <TableHead>Interest</TableHead>
              <TableHead>Penalty</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((s) => {
              const out = scheduleOutstanding(s);
              return (
                <TableRow key={s.id}>
                  <TableCell>{s.installmentNumber}</TableCell>
                  <TableCell className="whitespace-nowrap">{s.dueDate}</TableCell>
                  <TableCell className="font-tabular">{formatMoney(s.principalDue)}</TableCell>
                  <TableCell className="font-tabular">{formatMoney(s.interestDue)}</TableCell>
                  <TableCell className="font-tabular">{s.penaltyDue > 0 ? formatMoney(s.penaltyDue) : "—"}</TableCell>
                  <TableCell className="font-tabular">{formatMoney(out.total)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[s.status]} className="capitalize">
                      {s.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-tabular text-sm font-medium">{value}</p>
    </div>
  );
}
