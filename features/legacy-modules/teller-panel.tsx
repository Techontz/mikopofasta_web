"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";
import { SettingsCard } from "@/components/settings";
import { Field, Select } from "@/components/settings/form";
import { PROFILE_OPTIONS } from "@/lib/legacy/profile-fixtures";

/**
 * Teller → Teller Dashboard.
 *
 * DESIGN ONLY. The capture overturned what this screen was previously built as.
 * It had been modelled as a cash-desk position — opening float, collections,
 * payouts, closing balance — reasoned from the menu label, because no
 * screenshot existed. The real screen is a customer search, and picking
 * somebody opens their Customer Loan Information.
 *
 * That is what this does: choosing a name navigates to /teller/{customerNumber}
 * with no second click, as the legacy screen does. The button stays for
 * keyboard users and for anyone who reopens the select without changing it.
 *
 * The options read "NAME / NUMBER" because the legacy ones do — this dropdown
 * is the only capture in the whole set that shows customer numbers.
 */
export function TellerPanel() {
  const router = useRouter();
  const [selected, setSelected] = React.useState("");
  const [opening, startNavigation] = React.useTransition();

  function open(id: string) {
    if (id) startNavigation(() => router.push(`/teller/${id}`));
  }

  return (
    <SettingsCard
      title="Search Customer"
      description="Pick a customer to open their teller session."
    >
      <form
        className="mx-auto max-w-md space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          open(selected);
        }}
      >
        <Field label="Search Customer" htmlFor="teller-customer">
          <Select
            id="teller-customer"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              open(e.target.value);
            }}
          >
            <option value="">Search Customer</option>
            {PROFILE_OPTIONS.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.label} / {customer.id}
              </option>
            ))}
          </Select>
        </Field>

        <button
          type="submit"
          disabled={selected === "" || opening}
          className="st-btn st-btn-primary w-full justify-center"
        >
          {opening ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Opening…
            </>
          ) : (
            <>
              Open Teller Session
              <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
            </>
          )}
        </button>
      </form>
    </SettingsCard>
  );
}
