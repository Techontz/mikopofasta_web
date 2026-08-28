import "server-only";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";

const token = async () => getApiToken();

/**
 * The admin-managed lookup lists behind every dropdown in the ERP.
 *
 * No dropdown value lives in the frontend. Loan types, customer types, banks,
 * occupations and the rest are rows in the database, created and renamed from
 * the Administration module, and read here at runtime — so adding one is a
 * data change rather than a deploy.
 */
export type MasterDataList =
  | "loan-types"
  | "customer-types"
  | "account-types"
  | "work-types"
  | "employment-types"
  | "occupations"
  | "banks"
  | "mobile-money-providers"
  | "marital-statuses"
  /* KYC document types — what a category's required documents name. */
  | "document-types"
  /* Which identity document was seen, and on what terms somebody is employed
     — see the 2026_08_30 migrations. */
  | "id-types"
  | "contract-types"
  /* The employing body. Its cadres are NOT a flat list: they belong to a
     sector, and getSectorCategories() below loads them one sector at a time,
     exactly as the address step loads districts one region at a time. */
  | "sectors"
  /* Private companies. A SEPARATE list from `sectors`: a ministry has cadres
     inside it and a company does not, and one list would offer a public
     servant a sugar mill to serve in. */
  | "employers";

export interface MasterDataOption {
  id: string;
  /** Stable machine value. Data references this; the name may be renamed. */
  code: string;
  name: string;
  description: string | null;
  sortOrder: number | null;
  isActive: boolean;
}

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
 * Every list, in one round of parallel requests.
 *
 * All of them rather than only the ones the registration form uses: the
 * return type says `Record<MasterDataList, ...>`, and a key that is declared
 * but never fetched is an `undefined` waiting to reach a dropdown. The profile
 * needs `document-types` and registration does not; one extra request is
 * cheaper than two functions that drift apart.
 *
 * Each fails soft to an empty array: a lookup being briefly unavailable should
 * leave one dropdown empty and explaining itself, not take down the whole
 * screen.
 */
export async function getRegistrationLookups() {
  const lists: MasterDataList[] = [
    "loan-types",
    "customer-types",
    "account-types",
    "work-types",
    "employment-types",
    "occupations",
    "banks",
    "mobile-money-providers",
    "marital-statuses",
    "document-types",
    "id-types",
    "contract-types",
    "sectors",
    "employers",
  ];

  const results = await Promise.all(
    lists.map((list) => getMasterData(list).catch(() => [] as MasterDataOption[]))
  );

  return Object.fromEntries(lists.map((list, i) => [list, results[i]])) as Record<
    MasterDataList,
    MasterDataOption[]
  >;
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
