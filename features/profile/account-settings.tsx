"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Activity as ActivityIcon,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Monitor,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { revokeMyOtherSessions } from "@/features/profile/actions";
import type { ActivityEntry, Security } from "@/types/profile";

/**
 * Account Settings — the Security and Activity tabs.
 *
 * Everything here is read out of records the system already keeps: the audit
 * trail for the password and sign-in history, Sanctum's token table for what
 * is signed in. Nothing is stored twice, so nothing can disagree with itself.
 */

/**
 * Dates are formatted on the client only.
 *
 * The server formats in its own timezone and the browser in the reader's, so a
 * value rendered during SSR and then hydrated produces a mismatch. Rendering
 * the placeholder first and the real value after mount is the honest fix — the
 * alternative is suppressing a warning that is telling the truth.
 */
/** A snapshot that never changes — the answer to "am I on the client" cannot. */
const subscribeNever = () => () => {};

function useLocalTime(iso: string | null): string {
  const onClient = React.useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );

  if (iso === null) return "Never";
  /* Server render emits the placeholder; the browser fills in its own
     timezone after hydration, so the two never disagree. */
  if (!onClient) return "—";

  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={tone === "warn" ? "text-sm font-medium text-amber-600" : "text-sm font-medium"}>
        {value}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------- security */

export function SecurityPanel({ security }: { security: Security }) {
  const [revoking, setRevoking] = React.useState(false);

  const passwordChanged = useLocalTime(security.passwordChangedAt);
  const lastLogin = useLocalTime(security.lastLoginAt);
  const lastFailed = useLocalTime(security.lastFailedLoginAt);

  const others = security.sessions.filter((s) => !s.current).length;

  async function revoke() {
    if (
      !window.confirm(
        "Sign out every other device signed in to this account? This one stays signed in."
      )
    ) {
      return;
    }

    setRevoking(true);
    const result = await revokeMyOtherSessions();
    setRevoking(false);

    if (result.ok) toast.success(result.message);
    else toast.error(result.message ?? "Could not sign the other sessions out.");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Password</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Changing it signs every other device out.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <Link href="/profile/password">
                <KeyRound className="size-3.5" />
                Change password
              </Link>
            }
          />
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
            <Fact label="Last changed" value={passwordChanged} />
            <Fact
              label="Last successful login"
              value={lastLogin + (security.lastLoginIp ? ` · ${security.lastLoginIp}` : "")}
            />
            {/* Shown only when one exists — an empty "Last failed login" reads
                as reassurance the record cannot actually give. */}
            {security.lastFailedLoginAt !== null && (
              <Fact
                label="Last failed login"
                value={
                  lastFailed + (security.lastFailedLoginIp ? ` · ${security.lastFailedLoginIp}` : "")
                }
                tone="warn"
              />
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">
              Active sessions ({security.sessions.length})
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Every device currently signed in to your account.
            </p>
          </div>
          {others > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={revoke} disabled={revoking}>
              {revoking ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
              Sign out other sessions
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {security.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active sessions recorded.</p>
          ) : (
            security.sessions.map((session) => <SessionRow key={session.id} session={session} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Lock className="size-3.5 text-muted-foreground" aria-hidden />
            Two-factor authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">Coming soon</Badge>
            <p className="text-sm text-muted-foreground">
              {/* Said plainly. A toggle that did nothing would be worse than
                  no toggle: somebody would believe they had enabled it. */}
              Not available yet. When it ships you will be able to require a second factor at
              sign-in.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SessionRow({ session }: { session: Security["sessions"][number] }) {
  const lastUsed = useLocalTime(session.lastUsedAt);
  const created = useLocalTime(session.createdAt);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <Monitor className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-40 flex-1">
        <p className="text-sm font-medium">{session.name}</p>
        <p className="text-xs text-muted-foreground">
          Signed in {created} · last used {lastUsed}
        </p>
      </div>
      {session.current ? (
        <Badge variant="default">
          <ShieldCheck className="size-3" aria-hidden />
          This device
        </Badge>
      ) : (
        <Badge variant="outline">Other device</Badge>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- activity */

/** SCREAMING_SNAKE → readable, with the acronyms this business uses restored. */
const ACRONYMS = ["kyc", "nida", "otp", "id", "tin", "hq", "sms", "ip"];

function readable(action: string): string {
  return action
    .toLowerCase()
    .replace(/_/g, " ")
    .split(" ")
    .map((word, i) =>
      ACRONYMS.includes(word)
        ? word.toUpperCase()
        : i === 0
          ? word.charAt(0).toUpperCase() + word.slice(1)
          : word
    )
    .join(" ");
}

export function ActivityPanel({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState icon={ActivityIcon} title="No recorded activity yet" />;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent activity ({entries.length})</CardTitle>
        <p className="text-xs text-muted-foreground">
          Actions recorded against your account, newest first. Read from the audit trail.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => (
          <ActivityRow key={entry.id} entry={entry} />
        ))}
      </CardContent>
    </Card>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const at = useLocalTime(entry.at);
  const notable = /FAILED|REVOKED|PASSWORD/.test(entry.action);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      {notable ? (
        <ShieldAlert className="size-4 shrink-0 text-amber-600" aria-hidden />
      ) : (
        <ActivityIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <div className="min-w-40 flex-1">
        <p className="text-sm font-medium">{readable(entry.action)}</p>
        <p className="text-xs text-muted-foreground">
          {at}
          {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
        </p>
      </div>
      <Badge variant="outline" className="text-[12px]">
        {entry.auditableType}
      </Badge>
    </div>
  );
}
