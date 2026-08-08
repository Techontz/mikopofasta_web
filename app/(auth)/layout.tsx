import { Building2, Landmark, Lock, Scale, ShieldCheck } from "lucide-react";
import pkg from "@/package.json";

/**
 * The signed-out shell: a dark brand panel beside the form.
 *
 * VISUAL ONLY. Nothing here authenticates, routes, validates or talks to the
 * API — it is the frame the login card sits in, and the card owns all of that.
 *
 * ## Why the left panel is always dark
 *
 * It is painted from its own fixed palette rather than from the theme tokens,
 * and it does not flip in dark mode. A marketing surface that changes colour
 * with the OS preference reads as a page that has not decided what it is; every
 * product this was measured against (Stripe, Mercury, Ramp) commits to one
 * treatment for it. The FORM does follow the theme, because that is
 * application chrome and the rest of the app follows it too.
 *
 * The values are the theme's own primary hue (258) at low lightness, so the
 * panel and the button on the card are demonstrably the same blue rather than
 * two blues that happen to sit next to each other.
 *
 * ## Why the background is CSS and not an image
 *
 * A grid, two soft glows and a ring — about 20 lines of gradient. No request,
 * no bytes, nothing to art-direct at four breakpoints, and it cannot go
 * stock-photo. `aria-hidden` throughout: it is texture, and a screen reader
 * reading it out would be noise before the form.
 */

const PANEL = {
  base: "oklch(0.21 0.045 258)",
  deep: "oklch(0.165 0.04 258)",
  ink: "oklch(0.97 0.005 258)",
  soft: "oklch(0.76 0.025 258)",
  faint: "oklch(0.62 0.03 258)",
  line: "oklch(1 0 0 / 9%)",
  glow: "oklch(0.55 0.13 258 / 22%)",
} as const;

const FEATURES = [
  { icon: ShieldCheck, label: "Secure Loan Management" },
  { icon: Scale, label: "Real-Time Accounting" },
  { icon: Building2, label: "Branch & Staff Management" },
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * The split is 40/60 and appears at `lg`. Below that the brand panel is not
     * shrunk or stacked, it is removed: on a phone it would push the form below
     * the fold, and the form is the only reason anyone opens this page.
     */
    <div className="min-h-svh lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section
        aria-label="About M-Kopa"
        className="relative hidden overflow-hidden px-10 py-12 lg:flex lg:flex-col xl:px-14"
        style={{ background: PANEL.base, color: PANEL.ink }}
      >
        <BrandBackdrop />

        {/* `relative` on every band so they sit above the backdrop's layers. */}
        <div className="relative flex items-center gap-3">
          <span
            className="flex size-11 items-center justify-center rounded-xl"
            style={{ background: "oklch(1 0 0 / 10%)", boxShadow: `inset 0 0 0 1px ${PANEL.line}` }}
          >
            <Landmark className="size-[22px]" strokeWidth={1.6} aria-hidden />
          </span>
          <span className="text-[15px] font-semibold tracking-[0.16em] uppercase">M-Kopa</span>
        </div>

        <div className="relative mt-auto pt-16">
          {/*
            A <p>, not an <h1>. The page's one heading is "Welcome back" on the
            card — that is what the page is for. This is display copy inside a
            labelled complementary section, and promoting it would give the
            screen two competing h1s and put the marketing one first in the
            heading order a screen-reader user navigates by.
          */}
          <p className="text-[34px] leading-[1.15] font-semibold tracking-tight xl:text-[38px]">
            Microfinance
            <br />
            Operating System
          </p>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed" style={{ color: PANEL.soft }}>
            Manage lending, collections, accounting and branch operations from one secure platform.
          </p>

          <ul className="mt-11 space-y-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3.5">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "oklch(1 0 0 / 8%)", boxShadow: `inset 0 0 0 1px ${PANEL.line}` }}
                >
                  <Icon className="size-4" strokeWidth={1.7} aria-hidden />
                </span>
                <span className="text-[14.5px]" style={{ color: PANEL.ink }}>
                  {label}
                </span>
              </li>
            ))}
          </ul>

          <div
            className="mt-12 max-w-md rounded-xl px-5 py-4"
            style={{ background: "oklch(1 0 0 / 5%)", boxShadow: `inset 0 0 0 1px ${PANEL.line}` }}
          >
            <p className="flex items-center gap-2 text-[13.5px] font-medium">
              <Lock className="size-4" strokeWidth={1.8} aria-hidden />
              Bank-grade security
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: PANEL.soft }}>
              Encrypted sessions, audit trails and role-based access.
            </p>
          </div>
        </div>

        <footer
          className="relative mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-14 text-[12px]"
          style={{ color: PANEL.faint }}
        >
          {/* Real values: the year is computed, the version is package.json's,
              the environment is the build's own. None is written down twice. */}
          <span>&copy; {new Date().getFullYear()} M-Kopa</span>
          <span aria-hidden>&middot;</span>
          <span>v{pkg.version}</span>
          <span aria-hidden>&middot;</span>
          <span className="capitalize">{process.env.NODE_ENV}</span>
        </footer>
      </section>

      {/*
        The form side. `min-h-svh` again so it fills the screen on mobile, where
        it is the only column.

        The ground is tinted and the card is `bg-card`, rather than both being
        white with the card drawn in by its border. A white card on a white page
        is not a card — it is a border — and the difference is the whole reason
        the shape reads as a surface you are meant to act on. The shadow is two
        layers: a 1px contact shadow so the edge is crisp, and a wide soft one
        for lift. One layer alone gives either a hard edge or a smudge.
      */}
      <main className="flex min-h-svh items-center justify-center bg-muted/40 px-5 py-12 sm:px-8">
        <div
          className="w-full max-w-[27rem] rounded-2xl border border-border bg-card p-7 sm:p-9"
          style={{
            boxShadow:
              "0 1px 2px oklch(0 0 0 / 4%), 0 14px 36px -14px oklch(0 0 0 / 14%)",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * The abstract backdrop — a grid, two glows and a ring.
 *
 * Ordered back to front. Each layer is faint on its own; the effect is in the
 * overlap, which is why none of them is turned up.
 */
function BrandBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* A 44px ledger grid, fading out toward the bottom so it never competes
          with the footer text. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${PANEL.line} 1px, transparent 1px), linear-gradient(90deg, ${PANEL.line} 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
          maskImage: "linear-gradient(to bottom, black, transparent 78%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 78%)",
        }}
      />
      {/* Two soft glows: one warming the top-left behind the logo, one deepening
          the bottom-right so the panel has a diagonal weight to it. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(60rem 40rem at 12% 8%, ${PANEL.glow}, transparent 62%), radial-gradient(45rem 45rem at 96% 104%, ${PANEL.deep}, transparent 58%)`,
        }}
      />
      {/* One oversized ring, mostly off-canvas. Reads as an arc rather than a
          circle, which is what keeps it from looking like a logo watermark. */}
      <div
        className="absolute -right-40 -bottom-52 size-[38rem] rounded-full"
        style={{ boxShadow: `inset 0 0 0 1px ${PANEL.line}, 0 0 0 1px ${PANEL.line}` }}
      />
    </div>
  );
}
