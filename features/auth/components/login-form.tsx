"use client";

import * as React from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Landmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "@/lib/auth/actions";

const INITIAL_STATE: LoginState = { ok: false };

/** Where the phone number is kept when "Remember me" is on. */
const REMEMBER_KEY = "mikopofasta.remembered-phone";

/*
 * localStorage read as an external store rather than in an effect.
 *
 * The obvious version — read it on mount and setState — is a cascading render,
 * and the React Compiler rejects it. `useSyncExternalStore` is the API for
 * exactly this: `getServerSnapshot` returns null so the server renders an empty
 * field, and the client swaps in the saved number as part of hydration instead
 * of in a second pass afterwards.
 *
 * Both functions are module-level so their identity is stable across renders.
 */
function subscribeToRemembered(onChange: () => void): () => void {
  /* `storage` fires in OTHER tabs, so signing out in one tab clears the field
     in another. Same-tab writes are handled by the state below. */
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

const readRemembered = (): string | null => window.localStorage.getItem(REMEMBER_KEY);
const noRememberedOnServer = (): string | null => null;

/**
 * Credentials are checked by `POST /api/v1/auth/login` through the Server
 * Action in lib/auth/actions.ts — this component never sees the bearer token,
 * which is sealed into the httpOnly session cookie on the server.
 *
 * ## What the redesign did and did not touch
 *
 * `loginAction`, `useActionState`, the two field names, `noValidate`, the error
 * shape and the `?expired=1` notice are exactly as they were. The submit path
 * is still the form's own — Enter in either field posts it, because it is a
 * real `<form action={…}>` and not a click handler pretending to be one.
 *
 * Three controls are new and all three are client-side only, by design:
 *
 * - **Show/hide password** toggles the input's `type`. No logic.
 * - **Remember me** stores the PHONE NUMBER in localStorage and fills it in
 *   next time. It deliberately does NOT extend the session — session lifetime
 *   is the server's and this brief said not to touch it — so the label is
 *   backed by a hint saying what it actually does. A checkbox that claimed to
 *   keep you signed in and did not would be worse than no checkbox.
 * - **Forgot password** explains who resets it. It is not a link, because
 *   there is no reset page to link to and a 404 is not a recovery flow. The
 *   API has the endpoints (`auth/forgot-password`, `auth/reset-password`);
 *   the screen for them is a separate piece of work.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);
  const expired = useSearchParams().get("expired") === "1";

  const [reveal, setReveal] = React.useState(false);
  const [showReset, setShowReset] = React.useState(false);

  const saved = React.useSyncExternalStore(
    subscribeToRemembered,
    readRemembered,
    noRememberedOnServer
  );

  /*
   * Null means "untouched, so show what was remembered". Once either control is
   * used the local value wins, which is what lets somebody clear a remembered
   * number and have it stay cleared.
   */
  const [typedPhone, setTypedPhone] = React.useState<string | null>(null);
  const [rememberChoice, setRememberChoice] = React.useState<boolean | null>(null);

  const phone = typedPhone ?? saved ?? "";
  const remember = rememberChoice ?? saved !== null;

  /* Written from the handlers, not from an effect: this is pushing state OUT to
     an external system, which is the direction that belongs in an event. */
  function onPhoneChange(value: string) {
    setTypedPhone(value);
    if (remember) window.localStorage.setItem(REMEMBER_KEY, value.trim());
  }

  function onRememberChange(checked: boolean) {
    setRememberChoice(checked);
    if (checked) window.localStorage.setItem(REMEMBER_KEY, phone.trim());
    else window.localStorage.removeItem(REMEMBER_KEY);
  }

  const phoneError = state.fieldErrors?.phone?.[0];
  const passwordError = state.fieldErrors?.password?.[0];
  const formError = !state.ok && state.message && !state.fieldErrors ? state.message : null;

  return (
    <div className="animate-in fade-in duration-500">
      {/* The brand mark, for the breakpoints where the panel beside it is gone.
          Without it a phone shows a form with no idea whose it is. */}
      <div className="mb-9 flex items-center gap-2.5 lg:hidden">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Landmark className="size-[18px]" strokeWidth={1.7} aria-hidden />
        </span>
        <span className="text-[13px] font-semibold tracking-[0.16em] text-foreground uppercase">
          M-Kopa
        </span>
      </div>

      <header>
        <h1 className="text-[27px] leading-tight font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-2 text-[14.5px] text-muted-foreground">Sign in to continue to your workspace.</p>
      </header>

      {/*
        Says why they are here, when they did not come here on purpose.
        /session-expired sets this after clearing a session whose API token
        the server had already stopped honouring. Without it the user is
        dropped on a login form for no stated reason, moments after the
        application was behaving as though they were signed in.
      */}
      {expired && (
        <p
          role="status"
          className="mt-7 rounded-xl border border-border bg-muted/60 px-4 py-3 text-[13.5px] text-muted-foreground"
        >
          Your session ended and you were signed out. Please log in again.
        </p>
      )}

      <form action={formAction} className="mt-8 space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-[13.5px] font-medium">
            Phone number
          </Label>
          <Input
            id="phone"
            name="phone"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="Eg. 0753XXXXXX"
            autoComplete="tel"
            inputMode="tel"
            required
            aria-invalid={!!phoneError}
            aria-describedby={phoneError ? "phone-error" : undefined}
            className="h-11 rounded-xl px-3.5 text-[15px] md:text-[15px]"
          />
          {phoneError && (
            <p id="phone-error" className="text-[12.5px] text-destructive">
              {phoneError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[13.5px] font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={reveal ? "text" : "password"}
              autoComplete="current-password"
              required
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? "password-error" : undefined}
              /* Right padding clears the toggle, so a long password scrolls
                 under the label rather than behind the button. */
              className="h-11 rounded-xl px-3.5 pr-11 text-[15px] md:text-[15px]"
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? "Hide password" : "Show password"}
              aria-pressed={reveal}
              aria-controls="password"
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {reveal ? (
                <EyeOff className="size-[18px]" strokeWidth={1.7} aria-hidden />
              ) : (
                <Eye className="size-[18px]" strokeWidth={1.7} aria-hidden />
              )}
            </button>
          </div>
          {passwordError && (
            <p id="password-error" className="text-[12.5px] text-destructive">
              {passwordError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-0.5">
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(checked) => onRememberChange(checked === true)}
              aria-describedby="remember-hint"
            />
            <Label htmlFor="remember" className="cursor-pointer text-[13.5px] font-normal">
              Remember me
            </Label>
            {/* Visible to a screen reader only: the row stays clean, and the
                control still says what it does rather than implying more. */}
            <span id="remember-hint" className="sr-only">
              Fills your phone number in on this device next time. It does not keep you signed in.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowReset((v) => !v)}
            aria-expanded={showReset}
            aria-controls="reset-help"
            className="rounded-sm text-[13.5px] font-medium text-primary transition-opacity hover:opacity-70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Forgot password?
          </button>
        </div>

        {showReset && (
          <p
            id="reset-help"
            className="rounded-xl border border-dashed border-border px-4 py-3 text-[13px] leading-relaxed text-muted-foreground"
          >
            Passwords are reset by your branch manager or a system administrator. Contact them and you
            will be issued a new one.
          </p>
        )}

        {formError && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-[13.5px] text-destructive"
          >
            {formError}
          </p>
        )}

        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="h-11 w-full rounded-xl text-[15px] font-medium shadow-sm transition-shadow hover:shadow-md"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="mt-8 border-t border-border pt-5 text-[12.5px] leading-relaxed text-muted-foreground">
        Demo accounts: any seeded phone number (e.g. 0754000001) with password <code>password</code>.
      </p>
    </div>
  );
}

/**
 * What the login card looks like before the query string is known.
 *
 * Same heading, same field geometry, same button — only the interactive parts
 * are missing — so the Suspense boundary resolves without the layout moving.
 */
export function LoginFormSkeleton() {
  return (
    <div>
      <div className="mb-9 flex items-center gap-2.5 lg:hidden">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Landmark className="size-[18px]" strokeWidth={1.7} aria-hidden />
        </span>
        <span className="text-[13px] font-semibold tracking-[0.16em] text-foreground uppercase">
          M-Kopa
        </span>
      </div>

      <header>
        <h1 className="text-[27px] leading-tight font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-2 text-[14.5px] text-muted-foreground">Sign in to continue to your workspace.</p>
      </header>

      <div className="mt-8 space-y-5" aria-hidden>
        <div className="space-y-2">
          <Label className="text-[13.5px] font-medium">Phone number</Label>
          <Input disabled placeholder="Eg. 0753XXXXXX" className="h-11 rounded-xl px-3.5 text-[15px] md:text-[15px]" />
        </div>
        <div className="space-y-2">
          <Label className="text-[13.5px] font-medium">Password</Label>
          <Input disabled type="password" className="h-11 rounded-xl px-3.5 pr-11 text-[15px] md:text-[15px]" />
        </div>
        <Button disabled className="h-11 w-full rounded-xl text-[15px] font-medium">
          Sign in
        </Button>
      </div>

      <p className="mt-8 border-t border-border pt-5 text-[12.5px] leading-relaxed text-muted-foreground">
        Demo accounts: any seeded phone number (e.g. 0754000001) with password <code>password</code>.
      </p>
    </div>
  );
}
