"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/settings/form";

/**
 * Downloads the rows behind a table as CSV.
 *
 * Real, not decorative — it builds a file from the same data the table renders
 * and hands it to the browser. A disabled export button on every list would
 * have been quicker, but "can I get this into Excel?" is the first question
 * anyone asks of a report screen, and answering it is worth twenty lines.
 *
 * Everything happens client-side: there is no server round trip, which is what
 * lets it work during a design phase with no backend attached.
 */
/*
 * Constrained to `object`, not `Record<string, unknown>`. An interface has no
 * implicit index signature, so the stricter bound rejected every typed row
 * shape in the app while accepting the inline object literals it was first
 * written against. Nothing here indexes by an arbitrary string — `key` is
 * `keyof T` — so the looser bound loses no safety.
 */
export function ExportButton<T extends object>({
  rows,
  columns,
  filename,
}: {
  rows: readonly T[];
  /** Column header paired with the key it reads. Order is the CSV's order. */
  columns: readonly { header: string; key: keyof T }[];
  /** Base name; the row count and a .csv suffix are appended. */
  filename: string;
}) {
  const download = React.useCallback(() => {
    const header = columns.map((c) => escapeCsv(c.header)).join(",");
    const body = rows.map((row) => columns.map((c) => escapeCsv(row[c.key])).join(","));

    /*
     * The BOM is not decoration. Without it Excel on Windows reads the file as
     * the system codepage and mangles every non-ASCII character — which in a
     * Tanzanian customer list means a good number of names.
     */
    const csv = "﻿" + [header, ...body].join("\r\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${rows.length}-rows.csv`;
    link.click();

    // Released on the next tick; revoking synchronously can cancel the download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [rows, columns, filename]);

  return (
    <Button tone="secondary" icon={Download} onClick={download} disabled={rows.length === 0}>
      Export
    </Button>
  );
}

/**
 * Quote a CSV field.
 *
 * A comma, a quote or a newline inside a value will otherwise shift every
 * column after it — and free-text fields here include loan purposes and group
 * descriptions, which contain commas as a matter of course.
 */
function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
