"use server";

import { getDistricts, getRegions, getStreets, getWards } from "@/lib/api/organization";
import { getParentedOptions, getSectorCategories } from "@/lib/api/master-data";

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

/**
 * The cadres inside one sector — the same one-level-at-a-time shape as the
 * address cascade above, and for the same reason: the list belongs to its
 * parent, and loading every cadre of every employing body to fill one dropdown
 * is a full-table read for a form that will touch one branch of it.
 */
export async function loadSectorCategories(sectorId: string): Promise<GeoOption[]> {
  if (!sectorId) return [];
  try {
    return (await getSectorCategories(sectorId)).map((c) => ({ value: c.id, label: c.name }));
  } catch {
    return [];
  }
}

/**
 * Any parented lookup list, for the one parent that was chosen.
 *
 * The cadres action above is the two-level case of this; the customer types
 * brought seven more chains of the same shape — ministry → department → cadre,
 * sector → company, college → course — and they differ only in the slug. Fails
 * soft to an empty list for the same reason everything else here does: a
 * dropdown that cannot load says "none found" and stays usable.
 */
export async function loadParentedOptions(source: string, parentId: string): Promise<GeoOption[]> {
  if (!source || !parentId) return [];
  try {
    return (await getParentedOptions(source, parentId)).map((r) => ({ value: r.id, label: r.name }));
  } catch {
    return [];
  }
}
