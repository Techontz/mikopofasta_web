"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Filter, FilterBar, StatusBadge, type StatusTone } from "@/components/settings";
import { Select } from "@/components/settings/form";
import { cn } from "@/lib/utils";

/**
 * The pieces the Report screens share.
 *
 * Every one of them is built from the same components the Menu-tab modules use
 * — SettingsCard, SettingsTable, FilterBar, Filter, Select, StatusBadge — so
 * the two are indistinguishable. Nothing here introduces a second design
 * language; it only spares thirteen screens from repeating the same wiring.
 */

const ALL = "__all__";
export { ALL };

/**
 * The period strip several reports carry above their card.
 *
 * Drawn as the app's own segmented control — the same shape SectionNav and the
 * profile tabs use — rather than the legacy's outlined ovals. Which options it
 * holds is still per screen, because the originals differ: two have no "All",
 * and Write-off's is three states of a bad debt rather than periods.
 */
export function PeriodTabs({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className="inline-flex gap-1 rounded-lg p-1"
        role="tablist"
        aria-label="Period"
        style={{ background: "var(--st-subtle-strong)" }}
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={value === option}
            onClick={() => onChange(option)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              value === option
                ? "bg-[var(--st-card)] text-[var(--st-ink)] shadow-sm"
                : "text-[var(--st-ink-soft)] hover:text-[var(--st-ink)]"
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <Link href="/reports" className="st-btn st-btn-ghost h-9">
        <ArrowLeft className="size-3.5" strokeWidth={2} aria-hidden />
        Back
      </Link>
    </div>
  );
}

/** The two-line primary cell every table in this app leads with. */
export function Primary({ value, meta }: { value: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="whitespace-nowrap font-medium text-[var(--st-ink)]">{value}</p>
      {meta && <p className="mt-0.5 text-[12px] text-[var(--st-ink-faint)]">{meta}</p>}
    </div>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--st-ink-soft)]">{children}</span>;
}

/** A tabular figure — account numbers, phones, dates. */
export function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-tabular whitespace-nowrap">{children}</span>;
}

/**
 * Status → tone, in one place.
 *
 * The same StatusBadge the Menu modules use, so a "Default" here is the same
 * red as one on the Loan module. Colour never travels alone: the badge carries
 * a dot and the word.
 */
const TONES: Record<string, StatusTone> = {
  DONE: "active",
  DISBURSED: "neutral",
  DEFAULT: "danger",
};

export function CollectionStatus({ value }: { value: string }) {
  return (
    <StatusBadge tone={TONES[value] ?? "neutral"} className="capitalize">
      {value.toLowerCase()}
    </StatusBadge>
  );
}

/** A date, or the em dash the app uses where there is none. */
export function DateCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-[var(--st-ink-faint)]">—</span>;
  return <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">{value}</span>;
}

/**
 * A branch filter over a list of names.
 *
 * Its own component because every report that filters does it the same way, and
 * because the legacy data spells one branch three ways — the comparison is
 * case-insensitive so "MISSENYI" and "Missenyi" are one branch.
 */
export function BranchFilter({
  id,
  value,
  onChange,
  branches,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  branches: readonly string[];
}) {
  return (
    <Filter label="Branch" htmlFor={id}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL}>All branches</option>
        {branches.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </Select>
    </Filter>
  );
}

export function matchesBranch(rowBranch: string, filter: string) {
  return filter === ALL || rowBranch.toUpperCase() === filter.toUpperCase();
}

export { Filter, FilterBar };
