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
  | "document-types";

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
  ];

  const results = await Promise.all(
    lists.map((list) => getMasterData(list).catch(() => [] as MasterDataOption[]))
  );

  return Object.fromEntries(lists.map((list, i) => [list, results[i]])) as Record<
    MasterDataList,
    MasterDataOption[]
  >;
}
