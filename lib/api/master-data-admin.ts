import "server-only";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { MasterDataList, MasterDataOption } from "@/lib/api/master-data";

/**
 * The write half of the admin-managed lookup lists.
 *
 * `lib/api/master-data.ts` reads them for the forms that consume them; this
 * file is what Administration uses to create and edit them. Split so a page
 * that only needs to render a dropdown does not import the mutation helpers.
 */

const token = async () => getApiToken();

export interface MasterDataInput {
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number | null;
  isActive?: boolean;
  /** ID Types only — the document type that evidences this identity type. */
  documentTypeId?: string | null;
}

export async function createMasterDataEntry(list: MasterDataList, input: MasterDataInput) {
  return apiData<MasterDataOption>(`/api/v1/master-data/${list}`, {
    method: "POST",
    body: input,
    token: await token(),
  });
}

export async function updateMasterDataEntry(list: MasterDataList, id: string, input: MasterDataInput) {
  return apiData<MasterDataOption>(`/api/v1/master-data/${list}/${id}`, {
    method: "PUT",
    body: input,
    token: await token(),
  });
}

/**
 * Soft delete. The API refuses where a record is already referenced — the
 * foreign keys are `restrictOnDelete` — so deactivating is the usual action
 * and this is for entries created in error.
 */
export async function deleteMasterDataEntry(list: MasterDataList, id: string) {
  return apiData<{ removed: boolean }>(`/api/v1/master-data/${list}/${id}`, {
    method: "DELETE",
    token: await token(),
  });
}

/* ------------------------------------------------------- sector cadres --- */

export interface SectorCategoryInput extends MasterDataInput {
  /** Only on create: a cadre cannot be moved between employing bodies. */
  sectorId?: string;
}

export async function createSectorCategory(input: SectorCategoryInput) {
  return apiData<MasterDataOption>("/api/v1/master-data/sector-categories", {
    method: "POST",
    body: input,
    token: await token(),
  });
}

export async function updateSectorCategory(id: string, input: MasterDataInput) {
  return apiData<MasterDataOption>(`/api/v1/master-data/sector-categories/${id}`, {
    method: "PUT",
    body: input,
    token: await token(),
  });
}

export async function deleteSectorCategory(id: string) {
  return apiData<{ removed: boolean }>(`/api/v1/master-data/sector-categories/${id}`, {
    method: "DELETE",
    token: await token(),
  });
}
