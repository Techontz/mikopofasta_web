"use server";

import { getDistricts, getRegions, getStreets, getWards } from "@/lib/api/organization";

/**
 * The address cascade, fetched a level at a time.
 *
 * The registration form used to receive every region, every district, every
 * ward and every street as props and narrow them in the browser. That is four
 * full-table reads on every visit to the page, for a form where the officer
 * will touch exactly one branch of the tree — and in Tanzania the street table
 * alone is tens of thousands of rows. The list also had to be complete for the
 * filter to be correct, so it could never be paginated.
 *
 * Each level now asks for only what its parent makes reachable, and only when
 * the control is opened. The API has always supported it: `/districts` takes a
 * `region_id`, `/wards` a `district_id`, `/streets` a `ward_id`.
 *
 * Every one of these fails soft, to an empty list. A combobox that cannot load
 * says "none found" and stays usable; throwing here would take down the whole
 * registration form because a lookup was briefly unavailable.
 */

export interface GeoOption {
  value: string;
  label: string;
}

export async function loadRegions(): Promise<GeoOption[]> {
  try {
    return (await getRegions()).map((r) => ({ value: r.id, label: r.name }));
  } catch {
    return [];
  }
}

export async function loadDistricts(regionId: string): Promise<GeoOption[]> {
  if (!regionId) return [];
  try {
    return (await getDistricts(regionId)).map((d) => ({ value: d.id, label: d.name }));
  } catch {
    return [];
  }
}

export async function loadWards(districtId: string): Promise<GeoOption[]> {
  if (!districtId) return [];
  try {
    return (await getWards(districtId)).map((w) => ({ value: w.id, label: w.name }));
  } catch {
    return [];
  }
}

export async function loadStreets(wardId: string): Promise<GeoOption[]> {
  if (!wardId) return [];
  try {
    return (await getStreets(wardId)).map((s) => ({ value: s.id, label: s.name }));
  } catch {
    return [];
  }
}
