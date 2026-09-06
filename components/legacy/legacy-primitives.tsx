import Link from "next/link";
import { House } from "lucide-react";

/**
 * The handful of shapes the migrated screens share. Colours come from the
 * .lg-* tokens in globals.css, whose light values are the literal ones read off
 * the original screenshots — see the note above those rules.
 */

/** Plain grouped integer: the old screens print 350,000, never "TSh 350,000". */
const GROUPED = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function legacyNumber(value: number): string {
  return GROUPED.format(Math.round(value));
}

export function LegacyBreadcrumb({ trail }: { trail: string[] }) {
  return (
    <div className="flex items-center gap-2 text-[14px]" style={{ color: "var(--lg-muted)" }}>
      <Link
        href="/dashboard"
        aria-label="Home"
        className="hover:text-[var(--lg-link)]"
      >
        <House className="size-4" strokeWidth={1.6} aria-hidden />
      </Link>
      {trail.map((crumb) => (
        <span key={crumb} className="flex items-center gap-2">
          <span aria-hidden>/</span>
          <span>{crumb}</span>
        </span>
      ))}
    </div>
  );
}

export function LegacyTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[15px]">{children}</table>
    </div>
  );
}

/** Grey uppercase head — the old stats tables. Distinct from the blue DataTables head. */
export function LegacyTh({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`whitespace-nowrap border-b px-4 py-3.5 text-left text-[14px] font-bold uppercase tracking-wide ${className}`}
      style={{ background: "var(--lg-head)", borderColor: "var(--lg-line)", color: "var(--lg-text)" }}
    >
      {children}
    </th>
  );
}

export function LegacyTd({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`border-b px-4 py-3 ${className}`} style={{ borderColor: "var(--lg-row-line)" }}>
      {children}
    </td>
  );
}

/** Label followed by the bordered count pill, as every stats row is drawn. */
export function LegacyCount({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span>{label}</span>
      <span className="lg-badge font-tabular">
        {typeof value === "number" ? legacyNumber(value) : value}
      </span>
    </span>
  );
}
