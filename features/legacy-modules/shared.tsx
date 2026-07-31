"use client";

import * as React from "react";
import { Filter, FilterBar, StatusBadge, type StatusTone } from "@/components/settings";
import { Select } from "@/components/settings/form";
import { LEGACY_BRANCHES } from "@/lib/legacy/source";

/**
 * Pieces shared by the Teller, Agent, Insurance and VISA screens.
 *
 * Every captured legacy list follows the same shape — a numbered S/No., branch
 * and customer, a money column or two, a date, and a row of icon actions — so
 * these four screens follow it too. Sharing the cells rather than repeating
 * them means the nine pages cannot drift apart in ways nobody notices.
 */

export const ALL = "__all__";

/** The legacy tables number their own rows. */
export function Serial({ n }: { n: number }) {
  return <span className="font-tabular text-[var(--st-ink-soft)]">{n}.</span>;
}

export function Name({ children }: { children: React.ReactNode }) {
  return <span className="font-medium whitespace-nowrap text-[var(--st-ink)]">{children}</span>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap text-[var(--st-ink-soft)]">{children}</span>;
}

/** Dates and references, tabular so a column of them aligns. */
export function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">{children}</span>;
}

/**
 * A branch filter, populated from the three legacy branches.
 *
 * Its own component because "the dropdown is empty" is the fault this whole
 * pass exists to fix, and a single source for it is how that stays fixed.
 */
export function BranchFilter({
  id,
  value,
  onValueChange,
}: {
  id: string;
  value: string;
  onValueChange: (next: string) => void;
}) {
  return (
    <Filter label="Branch" htmlFor={id}>
      <Select id={id} value={value} onChange={(e) => onValueChange(e.target.value)}>
        <option value={ALL}>All branches</option>
        {LEGACY_BRANCHES.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </Select>
    </Filter>
  );
}

/** A filter over any list of string options. */
export function ChoiceFilter({
  id,
  label,
  value,
  onValueChange,
  options,
  allLabel = "All",
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (next: string) => void;
  options: readonly string[];
  allLabel?: string;
}) {
  return (
    <Filter label={label} htmlFor={id}>
      <Select id={id} value={value} onChange={(e) => onValueChange(e.target.value)}>
        <option value={ALL}>{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    </Filter>
  );
}

export { FilterBar };

const TONES: Record<string, StatusTone> = {
  active: "active",
  confirmed: "active",
  deposit: "active",
  pending: "warning",
  withdrawal: "warning",
  blocked: "danger",
  expired: "inactive",
};

/** Status badge with a tone chosen from the value, so the four modules agree. */
export function Status({ value }: { value: string }) {
  return <StatusBadge tone={TONES[value] ?? "neutral"}>{titleCase(value)}</StatusBadge>;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Says on the screen that the layout is a guess, not a reproduction.
 *
 * These four modules have never been screenshotted. Everything else in this
 * rebuild can be held against the old system column by column; these cannot,
 * and a reviewer has no way to tell the difference by looking. So the screen
 * says so itself.
 */
export function InferredLayoutNote({ module: moduleName }: { module: string }) {
  return (
    <div
      role="note"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--st-radius-sm)] border border-dashed border-[var(--st-line-strong)] bg-[var(--st-subtle)] px-4 py-3 text-[13px] text-[var(--st-ink-soft)]"
    >
      <span className="font-medium text-[var(--st-ink)]">Inferred layout.</span>
      <span>
        The legacy {moduleName} screen has never been captured, so these columns are reasoned from the
        menu label and the shape every other legacy list follows — not copied from the old system.
        Expect them to move once a screenshot arrives.
      </span>
    </div>
  );
}
