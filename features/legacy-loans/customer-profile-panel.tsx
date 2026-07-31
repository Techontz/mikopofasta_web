"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";
import { SettingsCard } from "@/components/settings";
import { Field, Select } from "@/components/settings/form";
import { PROFILE_OPTIONS } from "@/lib/legacy/profile-fixtures";

/**
 * Customer → Customer Profile, the search screen.
 *
 * The legacy screen is a single card holding one dropdown, and choosing
 * somebody opens their profile. That is what this does: pick a customer and
 * Open Profile navigates to /customers/profile/{customerNumber}, where the full
 * profile loads. It used to select and then sit there, which was the bug.
 *
 * The customer number is the route segment rather than an internal id, so the
 * URL says who it is and a reload lands back on the same person.
 */
export function CustomerProfilePanel() {
  const router = useRouter();
  const [selected, setSelected] = React.useState("");
  const [opening, startNavigation] = React.useTransition();

  function open() {
    if (!selected) return;
    startNavigation(() => router.push(`/customers/profile/${selected}`));
  }

  return (
    <SettingsCard title="Search customer" description="Pick somebody to open their profile.">
      <form
        className="mx-auto max-w-md space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          open();
        }}
      >
        <Field label="Select customer" htmlFor="customer-profile-select">
          <Select
            id="customer-profile-select"
            value={selected}
            onChange={(e) => {
              const next = e.target.value;
              setSelected(next);
              /*
                The legacy screen opens the profile on selection, with no second
                click. That is reproduced — the button below stays for keyboard
                users and for anyone who reopens the select without changing it.
              */
              if (next) startNavigation(() => router.push(`/customers/profile/${next}`));
            }}
          >
            <option value="">Select customer</option>
            {PROFILE_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} — {c.branch}
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
              Open Profile
              <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
            </>
          )}
        </button>
      </form>
    </SettingsCard>
  );
}
