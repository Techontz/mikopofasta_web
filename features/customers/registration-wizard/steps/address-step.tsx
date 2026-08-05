"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/settings/combobox";
import { RESIDENCE_TYPES } from "@/types/enums";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import {
  loadDistricts,
  loadRegions,
  loadStreets,
  loadWards,
} from "@/features/customers/geography-actions";

const NONE = "__none__";

/**
 * Region → District → Ward → Street, fetched a level at a time.
 *
 * WHAT THIS REPLACED. Four native selects fed by four props — every region,
 * every district, every ward and every street in the country — narrowed in the
 * browser with `.filter()`. Two problems, and the second is the bad one.
 *
 * The obvious one is weight: four full-table reads on every visit to a form
 * where the officer touches one branch of the tree, and the street table is the
 * largest in the system. The lists could never be paginated either, because the
 * client-side filter needed them complete to be correct.
 *
 * The real one is that a native select over four hundred wards is unusable.
 * There is no way to type "Msas" and land on Msasani; you scroll. So the
 * control that mattered most on this form was the one hardest to operate.
 *
 * Each level now loads on open, for its parent only, and can be typed into.
 * Choosing a parent clears everything below it — a ward that belongs to the
 * previous district is not a ward the customer lives in, and leaving it set is
 * how a bad address gets saved without anybody noticing.
 */
export function AddressStep() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const regionId = watch("regionId");
  const districtId = watch("districtId");
  const wardId = watch("wardId");
  const streetId = watch("streetId");

  /*
   * Stable identities, so the combobox's load effect is not re-triggered by a
   * new closure on every keystroke elsewhere in the form. Each closes over the
   * id it depends on, which is exactly what `loadKey` is compared against.
   */
  const regionLoader = React.useCallback(() => loadRegions(), []);
  const districtLoader = React.useCallback(() => loadDistricts(regionId ?? ""), [regionId]);
  const wardLoader = React.useCallback(() => loadWards(districtId ?? ""), [districtId]);
  const streetLoader = React.useCallback(() => loadStreets(wardId ?? ""), [wardId]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="addr-region">Region</Label>
          <Combobox
            id="addr-region"
            value={regionId ?? null}
            loadOptions={regionLoader}
            loadKey="regions"
            placeholder="Search region…"
            emptyMessage="No regions are configured."
            invalid={!!errors.regionId}
            onChange={(v) => {
              setValue("regionId", v, { shouldValidate: true });
              // Everything below is now about a different place.
              setValue("districtId", null);
              setValue("wardId", null);
              setValue("streetId", null);
            }}
          />
          {errors.regionId && <p className="text-xs text-destructive">{errors.regionId.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="addr-district">District</Label>
          <Combobox
            id="addr-district"
            value={districtId ?? null}
            loadOptions={districtLoader}
            loadKey={regionId ?? null}
            disabled={!regionId}
            disabledMessage="Select a region first"
            placeholder="Search district…"
            emptyMessage="No districts in this region."
            onChange={(v) => {
              setValue("districtId", v);
              setValue("wardId", null);
              setValue("streetId", null);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="addr-ward">Ward</Label>
          <Combobox
            id="addr-ward"
            value={wardId ?? null}
            loadOptions={wardLoader}
            loadKey={districtId ?? null}
            disabled={!districtId}
            disabledMessage="Select a district first"
            placeholder="Search ward…"
            emptyMessage="No wards in this district."
            onChange={(v) => {
              setValue("wardId", v);
              setValue("streetId", null);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="addr-street">Street</Label>
          <Combobox
            id="addr-street"
            value={streetId ?? null}
            loadOptions={streetLoader}
            loadKey={wardId ?? null}
            disabled={!wardId}
            disabledMessage="Select a ward first"
            placeholder="Search street…"
            emptyMessage="No streets in this ward."
            onChange={(v) => setValue("streetId", v)}
          />
        </div>

        {/* Three fixed options — a native select is the right control here, and
            a searchable one would be ceremony. */}
        <div className="space-y-1.5">
          <Label>Residence Type</Label>
          <Select
            value={watch("residenceType") ?? NONE}
            onValueChange={(v) =>
              setValue("residenceType", v === NONE ? null : (v as WizardValues["residenceType"]), {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger aria-label="Residence Type" className="w-full">
              <SelectValue placeholder="Owned or rented?">
                {(v: string) => (v === NONE ? "Owned or rented?" : v)}
              </SelectValue>
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
          {errors.residenceType && (
            <p className="text-xs text-destructive">{errors.residenceType.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
