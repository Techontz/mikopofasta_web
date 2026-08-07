"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import { updateMyProfile } from "@/features/profile/actions";
import type { Profile } from "@/types/profile";

/**
 * Preferences.
 *
 * Presentation only — none of this changes what a query returns or what a
 * report totals. That is a deliberate boundary: a date format is a rendering
 * choice, and letting it reach the data layer would make two users disagree
 * about the same record.
 *
 * Every option list is closed. The API validates against the same sets, so a
 * value that is not offered here is refused there too rather than stored and
 * quietly ignored.
 */

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "sw", label: "Kiswahili" },
];

/* The zones this business actually operates across, plus UTC. Not the full
   IANA list: a picker with 400 entries is a worse answer than a short one. */
const TIMEZONES = [
  { value: "Africa/Dar_es_Salaam", label: "Dar es Salaam (EAT, UTC+3)" },
  { value: "Africa/Nairobi", label: "Nairobi (EAT, UTC+3)" },
  { value: "Africa/Kampala", label: "Kampala (EAT, UTC+3)" },
  { value: "Africa/Kigali", label: "Kigali (CAT, UTC+2)" },
  { value: "UTC", label: "UTC" },
];

const DATE_FORMATS = [
  { value: "dd/mm/yyyy", label: "31/12/2026" },
  { value: "mm/dd/yyyy", label: "12/31/2026" },
  { value: "yyyy-mm-dd", label: "2026-12-31" },
  { value: "dd mmm yyyy", label: "31 Dec 2026" },
];

const NUMBER_FORMATS = [
  { value: "1,234.56", label: "1,234.56" },
  { value: "1.234,56", label: "1.234,56" },
  { value: "1 234.56", label: "1 234.56" },
];

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Follow system" },
];

const CHANNELS = [
  { key: "sms", label: "SMS" },
  { key: "email", label: "Email" },
  { key: "inApp", label: "In-app" },
] as const;

export function PreferencesPanel({ profile }: { profile: Profile }) {
  const { setTheme } = useTheme();
  const e = profile.editable;

  const [language, setLanguage] = React.useState(e.preferredLanguage);
  const [timezone, setTimezone] = React.useState(e.timezone);
  const [dateFormat, setDateFormat] = React.useState(e.dateFormat);
  const [numberFormat, setNumberFormat] = React.useState(e.numberFormat);
  const [theme, setThemeChoice] = React.useState(e.theme);
  const [prefs, setPrefs] = React.useState(e.notificationPreferences);
  const [saving, setSaving] = React.useState(false);

  const dirty =
    language !== e.preferredLanguage ||
    timezone !== e.timezone ||
    dateFormat !== e.dateFormat ||
    numberFormat !== e.numberFormat ||
    theme !== e.theme ||
    JSON.stringify(prefs) !== JSON.stringify(e.notificationPreferences);

  async function save() {
    setSaving(true);
    const result = await updateMyProfile({
      preferredLanguage: language,
      timezone,
      dateFormat,
      numberFormat,
      theme,
      notificationPreferences: prefs,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "Could not save your preferences.");
      return;
    }

    /*
     * The stored value follows the person between devices; next-themes still
     * owns the actual switch, so applying it here keeps the two in step
     * without changing how theming works anywhere else.
     */
    if (theme) setTheme(theme);
    toast.success("Preferences saved.");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Display</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              How dates, numbers and the interface are presented to you. Nothing here changes the
              underlying records.
            </p>
          </div>
          <Button type="button" size="sm" onClick={save} disabled={!dirty || saving}>
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            Save preferences
          </Button>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Language" id="pref-language">
              <Combobox
                id="pref-language"
                value={language}
                onChange={setLanguage}
                options={LANGUAGES}
                placeholder="System default"
              />
            </Field>
            <Field label="Time zone" id="pref-timezone">
              <Combobox
                id="pref-timezone"
                value={timezone}
                onChange={setTimezone}
                options={TIMEZONES}
                placeholder="System default"
              />
            </Field>
            <Field label="Date format" id="pref-date">
              <Combobox
                id="pref-date"
                value={dateFormat}
                onChange={setDateFormat}
                options={DATE_FORMATS}
                placeholder="System default"
              />
            </Field>
            <Field label="Number format" id="pref-number">
              <Combobox
                id="pref-number"
                value={numberFormat}
                onChange={setNumberFormat}
                options={NUMBER_FORMATS}
                placeholder="System default"
              />
            </Field>
            <Field label="Theme" id="pref-theme">
              <Combobox
                id="pref-theme"
                value={theme}
                onChange={setThemeChoice}
                options={THEMES}
                placeholder="Follow system"
              />
            </Field>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Leaving a field empty follows the system default.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notifications</CardTitle>
          <p className="text-xs text-muted-foreground">
            Which channels you want to hear from the system on.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-5">
            {CHANNELS.map((channel) => (
              <label key={channel.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={prefs[channel.key] ?? false}
                  onChange={(event) =>
                    setPrefs((p) => ({ ...p, [channel.key]: event.target.checked }))
                  }
                />
                {channel.label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
