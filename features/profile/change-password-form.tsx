"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeMyPassword } from "@/features/profile/actions";

/**
 * Change password.
 *
 * The current password is required even though the caller is already signed
 * in. That is the whole point of asking: it stops somebody who found an
 * unlocked machine from taking permanent ownership of the account.
 *
 * The policy is shown as a live checklist rather than as an error after
 * submitting. A rule you can only discover by failing it is a rule that gets
 * worked around with `Password1!`.
 *
 * The API is the authority on all of this — these checks only save a round
 * trip and tell the user what is expected.
 */

const RULES = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
  { label: "One symbol", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export function ChangePasswordForm() {
  const router = useRouter();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const met = RULES.map((rule) => rule.test(next));
  const policyOk = met.every(Boolean);
  const matches = next.length > 0 && next === confirm;
  const canSubmit = current.length > 0 && policyOk && matches && !saving;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setErrors({});
    const result = await changeMyPassword({
      currentPassword: current,
      password: next,
      passwordConfirmation: confirm,
    });
    setSaving(false);

    if (result.ok) {
      toast.success(result.message);
      setCurrent("");
      setNext("");
      setConfirm("");
      router.push("/profile");
      return;
    }

    if (result.fieldErrors) {
      const mapped: Record<string, string> = {};
      for (const [key, messages] of Object.entries(result.fieldErrors)) {
        if (messages[0]) mapped[key] = messages[0];
      }
      setErrors(mapped);
    }

    toast.error(result.message ?? "The password could not be changed.");
  }

  return (
    <div className="max-w-lg space-y-4">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={
          <Link href="/profile">
            <ArrowLeft className="size-4" />
            Back to my profile
          </Link>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Change password</CardTitle>
          <p className="text-xs text-muted-foreground">
            Every other device signed in to this account will be signed out. You will stay signed in
            here.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={current}
                aria-invalid={!!errors.current_password}
                onChange={(e) => setCurrent(e.target.value)}
              />
              {errors.current_password && (
                <p className="text-xs text-destructive">{errors.current_password}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={next}
                aria-invalid={!!errors.password}
                onChange={(e) => setNext(e.target.value)}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}

              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {RULES.map((rule, i) => (
                  <li
                    key={rule.label}
                    className={
                      met[i]
                        ? "flex items-center gap-1.5 text-xs text-emerald-600"
                        : "flex items-center gap-1.5 text-xs text-muted-foreground"
                    }
                  >
                    {met[i] ? (
                      <Check className="size-3 shrink-0" aria-hidden />
                    ) : (
                      <X className="size-3 shrink-0" aria-hidden />
                    )}
                    {rule.label}
                    <span className="sr-only">{met[i] ? "met" : "not met"}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                aria-invalid={confirm.length > 0 && !matches}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {confirm.length > 0 && !matches && (
                <p className="text-xs text-destructive">The two passwords do not match.</p>
              )}
            </div>

            <Button type="submit" disabled={!canSubmit}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Change password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
