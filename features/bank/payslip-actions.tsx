"use client";

import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/settings/form";

/**
 * Export PDF and Print, on a payslip.
 *
 * Both go through the browser's print pipeline, and deliberately so: there is
 * no PDF service to call, and the print dialog's "Save as PDF" produces a real
 * document from the same stylesheet the printed copy uses. A hand-rolled
 * client-side PDF would be a second layout to keep in step with this one.
 *
 * The `st-print-*` classes in globals.css strip the app chrome from the printed
 * page so what comes out is the payslip, not a screenshot of the dashboard.
 */
export function PayslipActions({ label }: { label: string }) {
  return (
    <div className="st-print-hide flex items-center gap-2">
      <Button type="button" tone="secondary" icon={FileDown} onClick={() => window.print()}>
        Export PDF
      </Button>
      <Button
        type="button"
        tone="secondary"
        icon={Printer}
        aria-label={`Print ${label}`}
        onClick={() => window.print()}
      >
        Print
      </Button>
    </div>
  );
}
