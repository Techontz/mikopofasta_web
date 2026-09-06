"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * One face for a person, used everywhere a person is named.
 *
 * The photo is the KYC liveness capture. The API does not send a file path for
 * it — `photoPath` is a signed, expiring URL to a private-disk download, because
 * the capture is biometric data — so this renders whatever URL arrived with the
 * record and quietly falls back when there is none or it has expired.
 *
 * THE FALLBACK IS THE COMMON CASE, not the error case. Most customers on most
 * screens have never had a capture taken, so initials have to look deliberate
 * rather than broken: a filled tint, not a grey box with a missing-image icon.
 *
 * The tint is derived from the name, so the same person is the same colour on
 * every screen — the list, the profile, the teller, the top bar. That
 * consistency is the point: it makes a row scannable without reading it, and it
 * is why the colour must come from the name and never from the row index.
 */

/**
 * Eight tints that read as a set.
 *
 * Deliberately not the status palette — a customer is not "green" for being
 * called Grace. These carry identity only, so they sit at a lower chroma than
 * anything that means something, and every one of them holds the same contrast
 * against its own foreground in both themes.
 */
const TINTS = [
  { bg: "oklch(0.93 0.045 250)", fg: "oklch(0.42 0.13 250)" }, // blue
  { bg: "oklch(0.93 0.045 155)", fg: "oklch(0.40 0.11 155)" }, // green
  { bg: "oklch(0.94 0.050 70)", fg: "oklch(0.44 0.12 70)" }, // amber
  { bg: "oklch(0.93 0.045 25)", fg: "oklch(0.45 0.14 25)" }, // red
  { bg: "oklch(0.93 0.045 300)", fg: "oklch(0.43 0.13 300)" }, // violet
  { bg: "oklch(0.93 0.045 195)", fg: "oklch(0.40 0.11 195)" }, // teal
  { bg: "oklch(0.93 0.045 340)", fg: "oklch(0.44 0.13 340)" }, // pink
  { bg: "oklch(0.93 0.040 120)", fg: "oklch(0.40 0.10 120)" }, // olive
] as const;

/** Stable across renders, reloads and machines — the same name is the same tint. */
function tintFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
}

/**
 * First and last initial.
 *
 * Middle names are skipped rather than truncated to three letters: "EMA" for
 * ELISHA M ADAMU is harder to read at 28px than "EA", and the surname is what
 * a teller is matching against.
 */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

const SIZES = {
  xs: "size-6 text-[11px]",
  sm: "size-8 text-[12px]",
  md: "size-10 text-[14px]",
  lg: "size-16 text-[18px]",
  xl: "size-24 text-[26px]",
} as const;

export type AvatarSize = keyof typeof SIZES;

export function CustomerAvatar({
  name,
  photoUrl,
  size = "sm",
  className,
}: {
  name: string;
  /** The signed URL from `photoPath`, when the record carries one. */
  photoUrl?: string | null;
  size?: AvatarSize;
  className?: string;
}) {
  /*
   * A signed URL expires, and an expired one is indistinguishable from a valid
   * one until it 404s. So a failed load is treated as "no photo" rather than
   * left as a broken image — the initials underneath are already correct.
   */
  const [failed, setFailed] = React.useState(false);
  const showPhoto = Boolean(photoUrl) && !failed;
  const tint = tintFor(name || "?");

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold leading-none",
        SIZES[size],
        className
      )}
      style={showPhoto ? undefined : { background: tint.bg, color: tint.fg }}
      /* The name is on the row already; repeating it here would make a screen
         reader say it twice. Hence aria-hidden and no title. */
    >
      {showPhoto ? (
        /* A plain <img>, not next/image: this is a signed, expiring URL on a
           host that varies per deployment, and routing biometric captures
           through the image optimizer is not something to do by default. */
        <img
          src={photoUrl!}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
          loading="lazy"
          decoding="async"
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}

/**
 * The avatar with the person's name beside it — the shape a table cell wants.
 *
 * Exists so the fifteen screens that show "a customer in a row" cannot drift
 * apart in how they lay it out.
 */
export function CustomerCell({
  name,
  photoUrl,
  secondary,
  size = "sm",
  className,
}: {
  name: string;
  photoUrl?: string | null;
  /** Customer number, phone, branch — whatever identifies them on this screen. */
  secondary?: React.ReactNode;
  size?: AvatarSize;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <CustomerAvatar name={name} photoUrl={photoUrl} size={size} />
      <div className="min-w-0">
        <p className="truncate font-medium text-[var(--st-ink)]">{name}</p>
        {secondary !== undefined && secondary !== null && secondary !== "" && (
          <p className="truncate text-[12.5px] text-[var(--st-ink-faint)]">{secondary}</p>
        )}
      </div>
    </div>
  );
}
