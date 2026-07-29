import Link from "next/link";
import { ChevronRight, Home, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The Settings component kit.
 *
 * Presentation only — nothing here fetches, validates, calculates or decides
 * permissions. Every screen under /admin composes these so a change to the
 * configuration surface is made once, in this file, rather than ten times.
 */

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

export interface Crumb {
  label: string;
  href?: string;
}

export function SettingsBreadcrumb({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12.5px] text-[var(--st-ink-faint)]">
      <Link href="/dashboard" aria-label="Dashboard" className="transition-colors hover:text-[var(--st-ink)]">
        <Home className="size-3.5" strokeWidth={1.8} aria-hidden />
      </Link>
      {trail.map((crumb, i) => {
        const last = i === trail.length - 1;
        return (
          <span key={crumb.label} className="flex items-center gap-1.5">
            <ChevronRight className="size-3 text-[#c8cdd5]" aria-hidden />
            {crumb.href && !last ? (
              <Link href={crumb.href} className="transition-colors hover:text-[var(--st-ink)]">
                {crumb.label}
              </Link>
            ) : (
              <span className={last ? "font-medium text-[var(--st-ink)]" : undefined} aria-current={last ? "page" : undefined}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  icon: Icon,
}: {
  title: string;
  description?: string;
  breadcrumb?: Crumb[];
  actions?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <header className="space-y-3">
      {breadcrumb && <SettingsBreadcrumb trail={breadcrumb} />}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px] border"
              style={{ background: "var(--st-accent-soft)", borderColor: "#dde6fb", color: "var(--st-accent)" }}
            >
              <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-[19px] font-semibold leading-tight tracking-[-0.01em] text-[var(--st-ink)]">{title}</h1>
            {description && (
              <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-[var(--st-ink-soft)]">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function SettingsCard({
  title,
  description,
  actions,
  footer,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("st-card overflow-hidden", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-5 pb-4 pt-[18px] sm:px-6">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--st-ink)]">{title}</h2>}
            {description && (
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--st-ink-soft)]">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children && (
        <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", !title && !actions && "pt-5 sm:pt-6", bodyClassName)}>
          {children}
        </div>
      )}
      {footer && (
        <div
          className="flex flex-wrap items-center justify-end gap-2 border-t px-5 py-3.5 sm:px-6"
          style={{ borderColor: "var(--st-line)", background: "#fcfcfd" }}
        >
          {footer}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

export function SectionDivider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cn("border-0 border-t", className)} style={{ borderColor: "var(--st-line)" }} />;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--st-ink-faint)]">{label}</span>
      <hr className="flex-1 border-0 border-t" style={{ borderColor: "var(--st-line)" }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

export type StatusTone = "active" | "inactive" | "default" | "warning" | "danger" | "info" | "neutral";

/**
 * Tone is expressed by colour and by the leading dot together, so the state
 * survives a greyscale print and a colour-blind reader.
 */
const TONES: Record<StatusTone, { bg: string; fg: string; border: string }> = {
  active: { bg: "#ecfdf3", fg: "#067647", border: "#abefc6" },
  inactive: { bg: "#f4f5f7", fg: "#5b6472", border: "#e0e3e8" },
  default: { bg: "#eef3fe", fg: "#2f6feb", border: "#c9dcfd" },
  warning: { bg: "#fffaeb", fg: "#b54708", border: "#fedf89" },
  danger: { bg: "#fef3f2", fg: "#b42318", border: "#fecdca" },
  info: { bg: "#f0f9ff", fg: "#026aa2", border: "#b9e6fe" },
  neutral: { bg: "#f9fafb", fg: "#5b6472", border: "#e0e3e8" },
};

export function StatusBadge({
  tone = "neutral",
  children,
  dot = true,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn("st-badge", !dot && "st-badge-plain", className)}
      style={{ background: t.bg, color: t.fg, borderColor: t.border }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

/** Sits above a table or list: filters on the left, primary action on the right. */
export function PageToolbar({
  children,
  action,
  className,
}: {
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
      {action && <div className="ml-auto flex items-center gap-2">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-[#e9ebef]", className)} />;
}

/** Header placeholder — matches PageHeader's metrics so nothing shifts on load. */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Bar className="h-3.5 w-40" />
      <div className="flex items-start gap-3">
        <Bar className="size-9 shrink-0 rounded-[10px]" />
        <div className="space-y-2 pt-0.5">
          <Bar className="h-5 w-52" />
          <Bar className="h-3.5 w-80 max-w-full" />
        </div>
      </div>
    </div>
  );
}

export function SettingsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Bar className="h-[38px] w-full rounded-[10px] sm:w-72" />
        <Bar className="ml-auto h-9 w-32 rounded-[10px]" />
      </div>
      <div className="st-card divide-y" style={{ borderColor: "var(--st-line)" }}>
        <div className="flex gap-4 px-4 py-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bar key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <Bar key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsCardsSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="st-card space-y-3 p-5">
          <Bar className="size-9 rounded-[10px]" />
          <Bar className="h-4 w-32" />
          <Bar className="h-3.5 w-full" />
          <Bar className="h-3.5 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function SettingsFormSkeleton() {
  return (
    <div className="st-card space-y-5 p-6">
      <div className="space-y-2">
        <Bar className="h-4 w-40" />
        <Bar className="h-3.5 w-72 max-w-full" />
      </div>
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Bar className="h-3 w-24" />
            <Bar className="h-[38px] w-full rounded-[10px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
