"use client";

import { SelectBox } from "@/components/ui/SelectBox";

export type PeriodType = "day" | "week" | "month" | "all";

/** Branch + period selection shared by the lists that open on today (enhancement §7.2, §8, §9, §16). */
export interface PeriodState {
  branch_id: string;
  period: PeriodType;
  /** The day (Day), any day of the week (Week) or YYYY-MM (Month); unused for All Time. */
  anchor: string;
}

const PERIODS: { value: PeriodType; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All Time" },
];

function iso(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Today in the browser's own time zone (the branch's day, not UTC). */
export function localToday(): string {
  return iso(new Date());
}

export function todayPeriod(branchId = "all"): PeriodState {
  return { branch_id: branchId, period: "day", anchor: localToday() };
}

export function monthPeriod(branchId = "all"): PeriodState {
  return { branch_id: branchId, period: "month", anchor: localToday().slice(0, 7) };
}

/** The from/to dates of a period; All Time sends none, so the server returns every record. */
export function periodRange(state: PeriodState): { from?: string; to?: string } {
  if (state.period === "all" || !state.anchor) {
    return {};
  }
  if (state.period === "month") {
    const [year, month] = state.anchor.slice(0, 7).split("-").map(Number);
    return { from: iso(new Date(year, month - 1, 1)), to: iso(new Date(year, month, 0)) };
  }
  if (state.period === "week") {
    const day = new Date(`${state.anchor}T00:00:00`);
    const monday = new Date(day);
    monday.setDate(day.getDate() - ((day.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: iso(monday), to: iso(sunday) };
  }
  return { from: state.anchor, to: state.anchor };
}

/** The query a list sends: branch ("all" for every branch in the user's scope) plus the period's dates. */
export function periodQuery(state: PeriodState): Record<string, string | undefined> {
  return { branch_id: state.branch_id || "all", ...periodRange(state) };
}

/** A label for headers and printouts, e.g. "Week 2026-10-26 to 2026-11-01". */
export function periodLabel(state: PeriodState): string {
  const range = periodRange(state);
  if (!range.from) {
    return "All time";
  }
  return range.from === range.to ? range.from : `${range.from} to ${range.to}`;
}

interface Props {
  value: PeriodState;
  onChange: (next: PeriodState) => void;
  /** Hide the period controls (branch only, e.g. Active Loans). */
  branchOnly?: boolean;
  /** Periods offered; all four by default. */
  periods?: PeriodType[];
  idPrefix?: string;
}

/** Branch (or All Branches) and Day / Week / Month / All Time with the matching date, week or month picker. */
export function PeriodFilter({ value, onChange, branchOnly, periods, idPrefix = "period" }: Props) {
  const offered = PERIODS.filter((item) => !periods || periods.includes(item.value));
  const setPeriod = (period: PeriodType) => {
    const today = localToday();
    onChange({ ...value, period, anchor: period === "month" ? today.slice(0, 7) : period === "all" ? "" : today });
  };

  return (
    <div className="mf-filters mf-period-filter">
      <div style={{ minWidth: 200 }}>
        <SelectBox inputId={`${idPrefix}-branch`} placeholder="All Branches" optionsUrl="options/branches" query={{ with_all: 1 }} value={value.branch_id || "all"} onChange={(next) => onChange({ ...value, branch_id: next ?? "all" })} />
      </div>
      {!branchOnly && (
        <>
          <select id={`${idPrefix}-type`} className="form-control" style={{ width: 140 }} value={value.period} onChange={(event) => setPeriod(event.target.value as PeriodType)} aria-label="Period">
            {offered.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          {value.period === "month" && (
            <input type="month" className="form-control" style={{ width: 170 }} value={value.anchor} onChange={(event) => onChange({ ...value, anchor: event.target.value })} aria-label="Month" />
          )}
          {(value.period === "day" || value.period === "week") && (
            <input type="date" className="form-control" style={{ width: 170 }} value={value.anchor} onChange={(event) => onChange({ ...value, anchor: event.target.value })} aria-label={value.period === "week" ? "Any day of the week" : "Day"} />
          )}
          {value.period === "week" && <small className="text-muted align-self-center">{periodLabel(value)}</small>}
        </>
      )}
    </div>
  );
}
