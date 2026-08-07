"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Camera, KeyRound, Loader2, Lock, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import { CustomerAvatar } from "@/components/customer-avatar";
import { removeMyPhoto, updateMyPhoto, updateMyProfile } from "@/features/profile/actions";
import type { Profile } from "@/types/profile";

/**
 * The profile screen's panels.
 *
 * Two ideas the layout has to carry, because getting them wrong is how a
 * profile page becomes a security problem:
 *
 *   1. Editable and read-only are visually distinct. The read-only block has
 *      no inputs at all — not disabled inputs, none — so there is nothing to
 *      re-enable in dev tools and nothing that looks like it might submit.
 *   2. Absence is stated. Where the system holds no value the field reads
 *      "Not recorded", never an empty box that suggests the data is missing
 *      for this person specifically.
 *
 * The controls are the ones the rest of the app already uses — Card, Input,
 * Combobox, the same Edit/Cancel/Save rhythm as the customer profile — so this
 * introduces no new design language.
 */

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "sw", label: "Kiswahili" },
];

const when = (iso: string | null) =>
  iso === null
    ? "Not recorded"
    : new Date(iso).toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

export function ProfilePanels({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-4">
      <PersonalSection profile={profile} />
      <EmploymentCard profile={profile} />
      <PermissionsCard permissions={profile.permissions} />
    </div>
  );
}

/** The header card, shown above the tabs rather than inside one. */
export function ProfileHeaderCard({ profile }: { profile: Profile }) {
  return <IdentityCard profile={profile} />;
}

/* --------------------------------------------------------------- identity */

function IdentityCard({ profile }: { profile: Profile }) {
  const [uploading, setUploading] = React.useState(false);
  const [pending, setPending] = React.useState<File | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  /*
   * Preview before upload.
   *
   * The chosen file is held locally and shown at the size it will appear at,
   * so somebody can see they picked the wrong image before it reaches the
   * server — and before it replaces the picture already on file.
   */
  const previewUrl = React.useMemo(
    () => (pending ? URL.createObjectURL(pending) : null),
    [pending]
  );
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function discard() {
    setPending(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function confirmUpload() {
    if (!pending) return;

    setUploading(true);
    const form = new FormData();
    form.append("photo", pending);
    const result = await updateMyPhoto(form);
    setUploading(false);

    if (result.ok) {
      toast.success(result.message);
      discard();
    } else {
      toast.error(result.message ?? "The picture could not be uploaded.");
    }
  }

  async function remove() {
    if (!window.confirm("Remove your profile picture? Your initials will be shown instead.")) return;

    setUploading(true);
    const result = await removeMyPhoto();
    setUploading(false);

    if (result.ok) toast.success(result.message);
    else toast.error(result.message ?? "The picture could not be removed.");
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-5 pt-6">
        <CustomerAvatar name={profile.name} photoUrl={profile.photoUrl} size="lg" />

        <div className="min-w-40 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{profile.name}</h1>
            <Badge variant={profile.readOnly.userStatus === "active" ? "default" : "secondary"} className="capitalize">
              {profile.readOnly.userStatus}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {profile.readOnly.role?.replace(/_/g, " ") ?? "No role"}
            {profile.readOnly.branch ? ` · ${profile.readOnly.branch}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Signs in as <span className="font-medium">{profile.username}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPending(file);
            }}
          />

          {pending ? (
            <div className="flex items-center gap-2 rounded-lg border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL */}
              <img
                src={previewUrl ?? ""}
                alt="Preview of the picture you selected"
                className="size-12 rounded-full border object-cover"
              />
              <div className="text-xs">
                <p className="font-medium">Preview</p>
                <p className="max-w-32 truncate text-muted-foreground">{pending.name}</p>
              </div>
              <Button type="button" size="sm" onClick={confirmUpload} disabled={uploading}>
                {uploading && <Loader2 className="size-3.5 animate-spin" />}
                Upload
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={discard} disabled={uploading}>
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
                {profile.photoUrl ? "Replace picture" : "Add picture"}
              </Button>
              {profile.photoUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={uploading}
                  onClick={remove}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              )}
            </>
          )}
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
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------ self-service */

type Draft = Record<string, string | null>;

const FIELDS: { name: string; label: string; kind?: "select"; group: string }[] = [
  { name: "phone", label: "Phone number", group: "Contact" },
  { name: "email", label: "Email", group: "Contact" },
  { name: "address", label: "Address", group: "Contact" },
  { name: "emergencyContactName", label: "Emergency contact", group: "Emergency contact" },
  { name: "emergencyContactPhone", label: "Emergency phone", group: "Emergency contact" },
  { name: "emergencyContactRelationship", label: "Relationship", group: "Emergency contact" },
  { name: "nextOfKinName", label: "Next of kin", group: "Next of kin" },
  { name: "nextOfKinPhone", label: "Next of kin phone", group: "Next of kin" },
  { name: "nextOfKinRelationship", label: "Relationship", group: "Next of kin" },
];

function PersonalSection({ profile }: { profile: Profile }) {
  const values = React.useMemo(
    () => ({ ...profile.editable }) as unknown as Draft,
    [profile.editable]
  );

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(values);
  const [prefs, setPrefs] = React.useState(profile.editable.notificationPreferences);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  /* The server is the source of truth — a save revalidates and new values
     arrive, so the draft follows them rather than holding a stale copy. */
  const [seen, setSeen] = React.useState(values);
  if (seen !== values && !editing) {
    setSeen(values);
    setDraft(values);
    setPrefs(profile.editable.notificationPreferences);
  }

  const changed = React.useMemo(() => {
    const out: Record<string, string | null> = {};
    for (const f of FIELDS) {
      const norm = (v: unknown) => (v === "" || v === undefined ? null : v);
      if (norm(values[f.name]) !== norm(draft[f.name])) out[f.name] = norm(draft[f.name]) as string | null;
    }
    return out;
  }, [draft, values]);

  const prefsChanged =
    JSON.stringify(prefs) !== JSON.stringify(profile.editable.notificationPreferences);
  const isDirty = Object.keys(changed).length > 0 || prefsChanged;

  React.useEffect(() => {
    if (!editing || !isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing, isDirty]);

  async function save() {
    setSaving(true);
    setErrors({});
    const result = await updateMyProfile({
      ...changed,
      ...(prefsChanged ? { notificationPreferences: prefs } : {}),
    });
    setSaving(false);

    if (result.ok) {
      toast.success(result.message ?? "Profile updated.");
      setEditing(false);
      return;
    }

    if (result.fieldErrors) {
      const mapped: Record<string, string> = {};
      for (const [key, messages] of Object.entries(result.fieldErrors)) {
        if (messages[0]) mapped[key] = messages[0];
      }
      setErrors(mapped);
      toast.error(Object.values(mapped)[0] ?? result.message);
      return;
    }

    toast.error(result.message ?? "Could not save.");
  }

  const groups = [...new Set(FIELDS.map((f) => f.group))];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Personal information</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Details you maintain about yourself.
          </p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => {
                if (isDirty && !window.confirm("Discard your unsaved changes?")) return;
                setDraft(values);
                setPrefs(profile.editable.notificationPreferences);
                setErrors({});
                setEditing(false);
              }}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={!isDirty || saving}>
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Save
            </Button>
          </div>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{group}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {FIELDS.filter((f) => f.group === group).map((field) => {
                const error = errors[field.name];
                const value = draft[field.name];

                return (
                  <div key={field.name} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                    {!editing ? (
                      <p className="min-h-[1.5rem] text-sm font-medium">
                        {values[field.name] ? (
                          field.kind === "select"
                            ? (LANGUAGES.find((l) => l.value === values[field.name])?.label ??
                              values[field.name])
                            : values[field.name]
                        ) : (
                          <span className="text-muted-foreground">Not recorded</span>
                        )}
                      </p>
                    ) : field.kind === "select" ? (
                      <Combobox
                        value={value ?? null}
                        onChange={(v) => setDraft((d) => ({ ...d, [field.name]: v }))}
                        options={LANGUAGES}
                        placeholder="Select…"
                      />
                    ) : (
                      <Input
                        value={value ?? ""}
                        aria-invalid={!!error}
                        onChange={(e) => setDraft((d) => ({ ...d, [field.name]: e.target.value }))}
                      />
                    )}
                    {error && <p className="text-xs text-destructive">{error}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Notifications</p>
          <div className="flex flex-wrap gap-4">
            {(["sms", "email", "inApp"] as const).map((channel) => (
              <label key={channel} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={!editing}
                  checked={prefs[channel] ?? false}
                  onChange={(e) => setPrefs((p) => ({ ...p, [channel]: e.target.checked }))}
                  className="size-4"
                />
                {channel === "inApp" ? "In-app" : channel === "sms" ? "SMS" : "Email"}
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------- read-only */

function EmploymentCard({ profile }: { profile: Profile }) {
  const r = profile.readOnly;

  /*
   * Rendered as text, never as disabled inputs. A disabled input is still a
   * form control — it looks like something that could be enabled, and on a
   * page whose whole point is that these values are somebody else's to set,
   * that is the wrong thing to show.
   */
  const rows: { label: string; value: string; dateLike?: boolean }[] = [
    { label: "Employee number", value: r.employeeNumber ?? "Not recorded" },
    { label: "Staff ID", value: r.staffId ?? "Not recorded" },
    { label: "Branch", value: r.branch ?? "Not recorded" },
    { label: "Zone", value: r.zone ?? "Not recorded" },
    { label: "Region", value: r.region ?? "Not recorded" },
    { label: "Role", value: r.role?.replace(/_/g, " ") ?? "Not recorded" },
    { label: "Employment status", value: r.employmentStatus?.replace(/_/g, " ") ?? "Not recorded" },
    { label: "Date joined", value: r.hiredAt ?? "Not recorded" },
    { label: "Supervisor", value: r.supervisor ?? "Not recorded" },
    { label: "Account status", value: r.userStatus },
    { label: "Account created", value: when(r.createdAt), dateLike: true },
    { label: "Last login", value: when(r.lastLoginAt), dateLike: true },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Lock className="size-3.5 text-muted-foreground" aria-hidden />
          Employment details
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Set by HR and administration. Contact them if any of this is wrong — it cannot be changed
          here.
        </p>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd
                /*
                 * These two cells hold locale- and timezone-formatted dates,
                 * which the server and the browser legitimately disagree
                 * about: the server formats in its own timezone, the browser
                 * in the reader's. Suppressing the warning here is the
                 * documented escape for exactly that case — the alternative
                 * is a hydration mismatch on every profile view.
                 */
                suppressHydrationWarning={row.dateLike}
                className={
                  row.value === "Not recorded"
                    ? "text-sm text-muted-foreground"
                    : "text-sm font-medium capitalize"
                }
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function PermissionsCard({ permissions }: { permissions: string[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Lock className="size-3.5 text-muted-foreground" aria-hidden />
          Permissions ({permissions.length})
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          What your role allows you to do. Granted by an administrator.
        </p>
      </CardHeader>
      <CardContent>
        {permissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No permissions granted.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {permissions.map((permission) => (
              <Badge key={permission} variant="outline" className="font-mono text-[11px]">
                {permission}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
