"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RESIDENCE_TYPES } from "@/types/enums";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { Region, District, Ward, Street } from "@/types/branch";

const NONE = "__none__";

export function AddressStep({
  regions,
  districts,
  wards,
  streets,
}: {
  regions: Region[];
  districts: District[];
  wards: Ward[];
  streets: Street[];
}) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const regionId = watch("regionId");
  const districtId = watch("districtId");
  const wardId = watch("wardId");

  const availableDistricts = districts.filter((d) => d.regionId === regionId);
  const availableWards = wards.filter((w) => w.districtId === districtId);
  const availableStreets = streets.filter((s) => s.wardId === wardId);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Region</Label>
          <Select
            value={regionId ?? NONE}
            onValueChange={(v) => {
              setValue("regionId", v === NONE ? null : v, { shouldValidate: true });
              setValue("districtId", null);
              setValue("wardId", null);
              setValue("streetId", null);
            }}
          >
            <SelectTrigger aria-label="Region" className="w-full">
              <SelectValue placeholder="Select region">{(v: string) => regions.find((r) => r.id === v)?.name ?? "Select region"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE} className="text-muted-foreground">
                Select region
              </SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.regionId && <p className="text-xs text-destructive">{errors.regionId.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>District</Label>
          <Select
            value={districtId ?? NONE}
            onValueChange={(v) => {
              setValue("districtId", v === NONE ? null : v);
              setValue("wardId", null);
              setValue("streetId", null);
            }}
            disabled={!regionId}
          >
            <SelectTrigger aria-label="District" className="w-full">
              <SelectValue placeholder={regionId ? "Select district" : "Select region first"}>
                {(v: string) => districts.find((d) => d.id === v)?.name ?? (regionId ? "Select district" : "Select region first")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE} className="text-muted-foreground">
                {regionId ? "Select district" : "Select region first"}
              </SelectItem>
              {availableDistricts.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Ward</Label>
          <Select
            value={wardId ?? NONE}
            onValueChange={(v) => {
              setValue("wardId", v === NONE ? null : v);
              setValue("streetId", null);
            }}
            disabled={!districtId}
          >
            <SelectTrigger aria-label="Ward" className="w-full">
              <SelectValue placeholder={districtId ? "Select ward" : "Select district first"}>
                {(v: string) => wards.find((w) => w.id === v)?.name ?? (districtId ? "Select ward" : "Select district first")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE} className="text-muted-foreground">
                {districtId ? "Select ward" : "Select district first"}
              </SelectItem>
              {availableWards.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Street</Label>
          <Select value={watch("streetId") ?? NONE} onValueChange={(v) => setValue("streetId", v === NONE ? null : v)} disabled={!wardId}>
            <SelectTrigger aria-label="Street" className="w-full">
              <SelectValue placeholder={wardId ? "Select street" : "Select ward first"}>
                {(v: string) => streets.find((s) => s.id === v)?.name ?? (wardId ? "Select street" : "Select ward first")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE} className="text-muted-foreground">
                {wardId ? "Select street" : "Select ward first"}
              </SelectItem>
              {availableStreets.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Residence Type</Label>
          <Select
            value={watch("residenceType") ?? NONE}
            onValueChange={(v) => setValue("residenceType", v === NONE ? null : (v as WizardValues["residenceType"]), { shouldValidate: true })}
          >
            <SelectTrigger aria-label="Residence Type" className="w-full">
              <SelectValue placeholder="Owned or rented?">{(v: string) => (v === NONE ? "Owned or rented?" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE} className="text-muted-foreground">
                Owned or rented?
              </SelectItem>
              {RESIDENCE_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.residenceType && <p className="text-xs text-destructive">{errors.residenceType.message}</p>}
        </div>
      </div>
    </div>
  );
}
