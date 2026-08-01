import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatMoney } from "@/lib/domain/money";
import { SortableHeader } from "@/features/reports/report-controls";
import type { ReportColumn, ReportResult, ReportRow } from "@/lib/domain/reports/types";

function renderCell(column: ReportColumn, row: ReportRow) {
  const value = row[column.key];
  if (value === undefined || value === null || value === "") return <span className="text-muted-foreground">—</span>;
  if (column.money && typeof value === "number") return formatMoney(value);
  if (column.percent && typeof value === "number") return `${value}%`;
  return String(value);
}

/**
 * `sortable` is the API's list of column keys it will order by. A header is
 * only made clickable when its key is in it — one that looked clickable and did
 * nothing would be worse than a plain one.
 */
export function ReportTable({
  result,
  sortable = [],
}: {
  result: ReportResult;
  sortable?: string[];
}) {
  if (result.rows.length === 0) {
    return <EmptyState title="Nothing to report" description={result.emptyMessage ?? "No data matches these filters."} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {result.columns.map((c) => (
              <TableHead key={c.key} className={c.align === "right" ? "text-right" : undefined}>
                <SortableHeader
                  columnKey={c.key}
                  label={c.label}
                  align={c.align}
                  sortable={sortable.includes(c.key)}
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((row, i) => (
            <TableRow key={i}>
              {result.columns.map((c) => (
                <TableCell
                  key={c.key}
                  className={`${c.align === "right" ? "text-right" : ""} ${c.money || c.percent ? "font-tabular" : ""} whitespace-nowrap`}
                >
                  {renderCell(c, row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {result.totals && (
            <TableRow className="font-medium">
              {result.columns.map((c) => (
                <TableCell
                  key={c.key}
                  className={`${c.align === "right" ? "text-right" : ""} ${c.money || c.percent ? "font-tabular" : ""} whitespace-nowrap`}
                >
                  {result.totals![c.key] === undefined ? "" : renderCell(c, result.totals!)}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
