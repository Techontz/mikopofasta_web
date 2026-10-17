import type { ReactNode } from "react";

/**
 * Building blocks shared by the department dashboards (Finance, CRM): the coloured icon tile, the change against the
 * previous period and the titled panel. Styles: styles/finance-dashboard.css (`fd-*`).
 */

export function IconTile({ icon, tone }: { icon: string; tone: string }) {
  return (
    <span className="fd-icon" style={{ color: tone, background: `color-mix(in srgb, ${tone} 12%, transparent)` }}>
      <i className={icon} />
    </span>
  );
}

export function Change({ value, compare }: { value: number | null; compare: string }) {
  if (value === null) {
    return <span className="fd-compare">No figure to compare {compare.replace("vs ", "with ")}</span>;
  }
  const up = value >= 0;
  return (
    <>
      <span className={`fd-change ${up ? "up" : "down"}`}>
        <i className={`fa fa-arrow-${up ? "up" : "down"}`} /> {Math.abs(value).toFixed(1)}%
      </span>
      <span className="fd-compare">{compare}</span>
    </>
  );
}

export function Panel({ title, period, action, children }: { title: string; period?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="fd-card fd-panel">
      <div className="fd-panel-head">
        <h3>{title}</h3>
        {period && <span className="fd-chip">{period}</span>}
        {action}
      </div>
      {children}
    </div>
  );
}
