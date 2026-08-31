import "server-only";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import { MASTER_DATA_LISTS, type MasterDataList, type MasterDataOption } from "@/types/master-data";

const token = async () => getApiToken();

/**
 * The admin-managed lookup lists behind every dropdown in the ERP.
 *
 * No dropdown value lives in the frontend. Loan types, customer types, banks,
 * occupations and the rest are rows in the database, created and renamed from
 * the Administration module, and read here at runtime — so adding one is a
 * data change rather than a deploy.
 */
export type { MasterDataList, MasterDataOption } from "@/types/master-data";
export { MASTER_DATA_LISTS, MASTER_DATA_LIST_LABELS } from "@/types/master-data";

/**
 * One list. `activeOnly` is what a form wants — a withdrawn entry must not be
 * offered to a new customer, though it still renders on the ones who hold it.
 */
export async function getMasterData(
  list: MasterDataList,
  activeOnly = true
): Promise<MasterDataOption[]> {
  return apiData<MasterDataOption[]>(`/api/v1/master-data/${list}`, {
    token: await token(),
    query: activeOnly ? { active: 1 } : {},
  });
}

/**
 * Every list, in ONE request.
 *
 * It used to be fourteen, issued in parallel — and that was the cause of the
 * 429 that made this screen unopenable. Fourteen requests, fourteen
 * authentications and fourteen rate-limiter increments to populate one form's
 * dropdowns meant a handful of visits exhausted an allowance sized for ordinary
 * work, and the next visit was refused. The data is a few hundred rows and is
 * the same for every officer; asking for it fourteen times was the defect, not
 * the limit that noticed.
 *
 * All the lists rather than only the ones registration uses: the return type
 * promises a value for every key, and the profile screen needs `document-types`
 * where registration does not. One request carries them all either way.
 */
export async function getRegistrationLookups(): Promise<Record<MasterDataList, MasterDataOption[]>> {
  const empty = Object.fromEntries(
    MASTER_DATA_LISTS.map((list) => [list, [] as MasterDataOption[]]),
  ) as unknown as Record<MasterDataList, MasterDataOption[]>;

  let served: Partial<Record<MasterDataList, MasterDataOption[]>>;

  try {
    served = await apiData<Partial<Record<MasterDataList, MasterDataOption[]>>>("/api/v1/master-data", {
      token: await token(),
      query: { active: 1 },
    });
  } catch {
    /* Fails soft, as the fourteen separate calls did: a lookup being briefly
       unavailable should leave dropdowns empty and explaining themselves, not
       take the registration screen down. */
    return empty;
  }

  /* Every declared key present, whatever the server sent. The return type
     promises a value for each list, and a key that is declared but never
     filled is an `undefined` waiting to reach a dropdown. */
  return { ...empty, ...served };
}

/**
 * The cadres inside one sector — Teachers and Nurses inside TAMISEMI.
 *
 * Separate from getMasterData() because this list has a parent. Returning
 * every cadre of every employing body to a form that has already chosen one
 * would be the same mistake the address lookups avoid, and the answer would
 * grow with every sector an administrator adds.
 *
 * An empty list when no sector is chosen, rather than the whole table: an
 * unfiltered request here has no meaningful answer.
 */
export async function getSectorCategories(sectorId: string | null): Promise<MasterDataOption[]> {
  if (!sectorId) return [];

  return apiData<MasterDataOption[]>("/api/v1/master-data/sector-categories", {
    token: await token(),
    query: { sector_id: sectorId, active: 1 },
  });
}
