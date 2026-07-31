"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SettingsCard } from "@/components/settings";
import { Field, Select } from "@/components/settings/form";
import { LEGACY_CUSTOMERS } from "@/lib/legacy/source";

/**
 * Loan → Loan Application, the landing screen.
 *
 * The legacy module opens on a customer search rather than on the form: pick
 * somebody, and the application follows. That first step is what this is.
 *
 * The choice does not travel yet. The wired application form at
 * /loans/new/apply asks for the customer itself, off the live API, so the
 * button says where it goes rather than implying a selection it cannot carry.
 * Wiring that hand-off is a job for when this screen stops being a design.
 */
export function LoanApplicationPanel() {
  const [selected, setSelected] = React.useState("");

  return (
    <SettingsCard
      title="Search customer"
      description="Pick a customer to start a new loan application."
    >
      <div className="mx-auto max-w-md space-y-5">
        <Field label="Search customer" htmlFor="loan-application-customer">
          <Select
            id="loan-application-customer"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select customer</option>
            {LEGACY_CUSTOMERS.map((customer) => (
              <option key={customer.name} value={customer.name}>
                {customer.name} — {customer.branch}
              </option>
            ))}
          </Select>
        </Field>

        <Link
          href="/loans/new/apply"
          aria-disabled={selected === ""}
          tabIndex={selected === "" ? -1 : undefined}
          className="st-btn st-btn-primary w-full justify-center"
          style={selected === "" ? { opacity: 0.5, pointerEvents: "none" } : undefined}
        >
          Start Application
          <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
        </Link>
      </div>
    </SettingsCard>
  );
}
