import Link from "next/link";
import { ChevronRight, Home, X, type LucideIcon } from "lucide-react";
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

/**
 * A crumb's identity is where it points, not what it reads.
 *
 * Two crumbs in one trail can legitimately share a label — "Capital › Capital"
 * is a section and a page that happen to be named the same — so keying on the
 * label alone collides. The destination distinguishes them: only the final
 * crumb has no href, and a trail has exactly one final crumb.
 */
function crumbKey(crumb: Crumb): string {
  return crumb.href ?? `current:${crumb.label}`;
}

export function SettingsBreadcrumb({ trail }: { trail: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      /* The trail scrolls rather than wraps: a two-line breadcrumb shifts the
         heading below it, and on a phone the tail is the part worth reading. */
      className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[13px] text-[var(--st-ink-faint)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <Link
        href="/dashboard"
        aria-label="Dashboard"
        className="shrink-0 rounded-[var(--st-radius-xs)] transition-colors hover:text-[var(--st-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--st-accent)]"
      >
        <Home className="size-4" strokeWidth={1.8} aria-hidden />
      </Link>
      {trail.map((crumb, i) => {
        const last = i === trail.length - 1;
        return (
          <span key={crumbKey(crumb)} className="flex shrink-0 items-center gap-1.5">
            <ChevronRight className="size-3.5 text-[var(--st-line-strong)]" aria-hidden />
            {crumb.href && !last ? (
              <Link
                href={crumb.href}
                className="rounded-[var(--st-radius-xs)] transition-colors hover:text-[var(--st-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--st-accent)]"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={last ? "font-medium text-[var(--st-ink)]" : undefined}
                aria-current={last ? "page" : undefined}
              >
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
              className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-[var(--st-radius-sm)] border"
              style={{
                background: "var(--st-accent-soft)",
                borderColor: "var(--st-accent-line)",
                color: "var(--st-accent)",
              }}
            >
              <Icon className="size-[22px]" strokeWidth={1.8} aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            {/* 24px on a phone, 30px from the small breakpoint up: a 30px
                title wraps to three lines on a 390px screen, and a page title
                that needs three lines has stopped being a title. */}
            <h1 className="text-[24px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--st-ink)] sm:text-[var(--st-text-2xl)]">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 max-w-2xl text-[var(--st-text-base)] leading-relaxed text-[var(--st-ink-soft)]">
                {description}
              </p>
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
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-[var(--st-pad-card-sm)] pb-4 pt-[var(--st-pad-card-sm)] sm:px-[var(--st-pad-card)] sm:pb-5 sm:pt-[var(--st-pad-card)]">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[var(--st-text-lg)] font-semibold leading-tight tracking-[-0.014em] text-[var(--st-ink)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1.5 max-w-2xl text-[var(--st-text-sm)] leading-relaxed text-[var(--st-ink-soft)]">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children && (
        <div
          className={cn(
            "px-[var(--st-pad-card-sm)] pb-[var(--st-pad-card-sm)] sm:px-[var(--st-pad-card)] sm:pb-[var(--st-pad-card)]",
            !title && !actions && "pt-[var(--st-pad-card-sm)] sm:pt-[var(--st-pad-card)]",
            bodyClassName
          )}
        >
          {children}
        </div>
      )}
      {footer && (
        /*
         * The action bar is tinted a shade off the card so it reads as a base
         * the card rests on rather than as more card. On a phone the buttons
         * stretch to full width — a 36px target at the edge of a 390px screen
         * is a miss waiting to happen.
         */
        <div
          className="flex flex-col-reverse gap-2.5 border-t px-[var(--st-pad-card-sm)] py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:px-[var(--st-pad-card)] [&>.st-btn]:w-full sm:[&>.st-btn]:w-auto"
          style={{ borderColor: "var(--st-line)", background: "var(--st-subtle)" }}
        >
          {footer}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page container
// ---------------------------------------------------------------------------

/**
 * The padding and rhythm every configuration screen sits in.
 *
 * Exists so the page gutter is decided once. Both `.st-scope` layouts inlined
 * the same class string, which is how they drifted apart the first time. There
 * is deliberately no max-width: these are dashboard screens, and a centred
 * column leaves dead gutters while the table inside it scrolls.
 */
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("w-full space-y-7 px-4 py-6 sm:px-6 sm:py-8 xl:px-8", className)}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/**
 * A figure in a table.
 *
 * Tabular numerals and right alignment are not decoration — they are what lets
 * a column of amounts be compared by length instead of read digit by digit.
 * `muted` is for a zero or a placeholder, so an empty cell reads as "nothing"
 * rather than as a number worth checking.
 */
export function Money({
  children,
  muted,
  strong,
  className,
}: {
  children: React.ReactNode;
  muted?: boolean;
  strong?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-tabular block text-right tabular-nums",
        strong && "font-semibold text-[var(--st-ink)]",
        muted && "text-[var(--st-ink-faint)]",
        className
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

/**
 * A single headline figure. Used in rows of two to four above a table.
 *
 * The label sits above the value, not beside it, so a row of tiles has one
 * baseline for its numbers — the thing the eye is actually scanning.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "accent";
  className?: string;
}) {
  return (
    <div className={cn("st-card p-5 sm:p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[var(--st-text-xs)] font-semibold uppercase tracking-[0.05em] text-[var(--st-ink-faint)]">
          {label}
        </p>
        {Icon && (
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-[var(--st-radius-xs)]"
            style={{
              background: tone === "accent" ? "var(--st-accent-soft)" : "var(--st-subtle-strong)",
              color: tone === "accent" ? "var(--st-accent)" : "var(--st-ink-faint)",
            }}
          >
            <Icon className="size-5" strokeWidth={1.8} aria-hidden />
          </span>
        )}
      </div>
      <p className="font-tabular mt-2.5 text-[28px] font-semibold leading-tight tracking-[-0.022em] text-[var(--st-ink)]">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--st-ink-soft)]">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

/** A titled band inside a card body, for a card that holds more than one list. */
export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-6 gap-y-2", className)}>
      <div className="min-w-0">
        <h3 className="text-[var(--st-text-base)] font-semibold tracking-[-0.012em] text-[var(--st-ink)]">{title}</h3>
        {description && (
          <p className="mt-1 text-[var(--st-text-sm)] leading-relaxed text-[var(--st-ink-soft)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

export function SectionDivider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cn("border-0 border-t", className)} style={{ borderColor: "var(--st-line)" }} />;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-[var(--st-text-xs)] font-semibold uppercase tracking-[0.06em] text-[var(--st-ink-faint)]">
        {label}
      </span>
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
 *
 * The colours themselves live in globals.css as `.st-tone-*`, not in a lookup
 * table here: a table of hex triples in a component can only describe one
 * theme, and this badge has to render in two. All that survives in TypeScript
 * is the tone's name.
 */
const TONE_CLASS: Record<StatusTone, string> = {
  active: "st-tone-active",
  inactive: "st-tone-inactive",
  default: "st-tone-default",
  warning: "st-tone-warning",
  danger: "st-tone-danger",
  info: "st-tone-info",
  neutral: "st-tone-neutral",
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
  return (
    <span className={cn("st-badge", TONE_CLASS[tone], !dot && "st-badge-plain", className)}>
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
// Filter bar
// ---------------------------------------------------------------------------

/**
 * The row of filters above a table.
 *
 * A plain wrapper on purpose: each screen owns its own filter state, because
 * each screen knows what its filters mean. What this centralises is the
 * geometry — filters wrap in reading order on a narrow viewport, the reset
 * affordance sits at the end of the row, and every screen's filter row is the
 * same height as every other's.
 */
export function FilterBar({
  children,
  onReset,
  active,
  className,
}: {
  children: React.ReactNode;
  /** Omit to hide the reset affordance entirely. */
  onReset?: () => void;
  /** Whether any filter is currently narrowing the list. */
  active?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      {children}
      {onReset && active && (
        <button
          type="button"
          onClick={onReset}
          className="st-btn st-btn-ghost shrink-0"
        >
          <X className="size-4" strokeWidth={2} aria-hidden />
          Clear filters
        </button>
      )}
    </div>
  );
}

/** One labelled control inside a FilterBar. Narrow by default; grows if asked. */
export function Filter({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 flex-1 sm:max-w-[210px]", className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[var(--st-text-xs)] font-semibold uppercase tracking-[0.05em] text-[var(--st-ink-faint)]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

/*
 * A placeholder bar. `--st-skeleton` moves with the theme, so a loading screen
 * in dark mode is dark — a light-grey pulse on a dark card is a flashbulb.
 */
function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--st-radius-xs)] bg-[var(--st-skeleton)]", className)} />;
}

/**
 * Skeletons mirror the metrics of what they stand in for — same heights, same
 * radii, same gaps — so the real content lands where the placeholder was
 * instead of pushing the page around as it arrives.
 */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Bar className="h-3.5 w-40" />
      <div className="flex items-start gap-3">
        <Bar className="size-11 shrink-0 rounded-[var(--st-radius-sm)]" />
        <div className="space-y-2.5 pt-0.5">
          <Bar className="h-7 w-52" />
          <Bar className="h-4 w-80 max-w-full" />
        </div>
      </div>
    </div>
  );
}

export function SettingsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Bar className="h-11 w-full rounded-[var(--st-radius-sm)] sm:w-72" />
        <Bar className="ml-auto h-11 w-32 rounded-[var(--st-radius-sm)]" />
      </div>
      <div className="st-card overflow-hidden">
        <div
          className="flex gap-4 border-b px-[var(--st-pad-cell-x)] py-[17px]"
          style={{ borderColor: "var(--st-line)", background: "var(--st-subtle)" }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Bar key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b px-[var(--st-pad-cell-x)] py-[19px] last:border-b-0"
            style={{ borderColor: "var(--st-line-soft)" }}
          >
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
        <div key={i} className="st-card space-y-3 p-5 sm:p-6">
          <Bar className="size-11 rounded-[var(--st-radius-sm)]" />
          <Bar className="h-4.5 w-32" />
          <Bar className="h-3.5 w-full" />
          <Bar className="h-3.5 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function SettingsFormSkeleton() {
  return (
    <div className="st-card space-y-6 p-5 sm:p-6">
      <div className="space-y-2">
        <Bar className="h-4 w-40" />
        <Bar className="h-3.5 w-72 max-w-full" />
      </div>
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Bar className="h-3.5 w-24" />
            <Bar className="h-11 w-full rounded-[var(--st-radius-sm)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
