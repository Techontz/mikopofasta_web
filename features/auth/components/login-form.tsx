"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAction, type LoginState } from "@/lib/auth/actions";

const INITIAL_STATE: LoginState = { ok: false };

/**
 * Credentials are checked by `POST /api/v1/auth/login` through the Server
 * Action in lib/auth/actions.ts — this component never sees the bearer token,
 * which is sealed into the httpOnly session cookie on the server.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);
  const expired = useSearchParams().get("expired") === "1";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in to your account</CardTitle>
        <CardDescription>Enter your phone number and password to continue.</CardDescription>
      </CardHeader>
      <CardContent>
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
            className="mb-4 rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground"
          >
            Your session ended and you were signed out. Please log in again.
          </p>
        )}
        <form action={formAction} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" name="phone" placeholder="Eg. 0753XXXXXX" autoComplete="tel" required />
            {state.fieldErrors?.phone && (
              <p className="text-xs text-destructive">{state.fieldErrors.phone[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
            {state.fieldErrors?.password && (
              <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
            )}
          </div>
          {!state.ok && state.message && !state.fieldErrors && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          Demo accounts: any seeded phone number (e.g. 0754000001) with password <code>password</code>.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * What the login card looks like before the query string is known.
 *
 * Same card, same heading, same field geometry — only the interactive parts are
 * missing — so the boundary above resolves without the layout moving.
 */
export function LoginFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in to your account</CardTitle>
        <CardDescription>Enter your phone number and password to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" aria-hidden>
          <div className="space-y-1.5">
            <Label>Phone number</Label>
            <Input disabled placeholder="Eg. 0753XXXXXX" />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input disabled type="password" />
          </div>
          <Button className="w-full" disabled>
            Log in
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
