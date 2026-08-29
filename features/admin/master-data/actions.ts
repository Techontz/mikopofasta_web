"use server";

import { revalidatePath } from "next/cache";
import {
  createMasterDataEntry,
  createSectorCategory,
  deleteMasterDataEntry,
  deleteSectorCategory,
  updateMasterDataEntry,
  updateSectorCategory,
  type MasterDataInput,
} from "@/lib/api/master-data-admin";
import { getMasterData, getSectorCategories, type MasterDataList, type MasterDataOption } from "@/lib/api/master-data";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Administration → Master Data.
 *
 * Thin pass-throughs. Every rule — uniqueness of the code, the permission,
 * whether an entry may be deleted — lives in the API, and a second opinion
 * formed here could only disagree with the one that will actually be applied.
 */

const ADMIN_PATH = "/admin/master-data";

export async function saveEntry(
  list: MasterDataList,
  id: string | null,
  input: MasterDataInput,
): Promise<ActionResult> {
  try {
    if (id) await updateMasterDataEntry(list, id, input);
    else await createMasterDataEntry(list, input);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(ADMIN_PATH);

  return { ok: true, message: id ? `${input.name} updated.` : `${input.name} added.` };
}

export async function removeEntry(list: MasterDataList, id: string, name: string): Promise<ActionResult> {
  try {
    await deleteMasterDataEntry(list, id);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(ADMIN_PATH);

  return { ok: true, message: `${name} removed.` };
}

/** Reloads one list after a change, so the table shows what the API now holds. */
export async function reloadList(list: MasterDataList): Promise<MasterDataOption[]> {
  try {
    // `false` — the admin screen must see disabled entries, which is the only
    // way to re-enable one.
    return await getMasterData(list, false);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------- sector cadres --- */

export async function loadCadres(sectorId: string): Promise<MasterDataOption[]> {
  try {
    return await getSectorCategories(sectorId);
  } catch {
    return [];
  }
}

export async function saveCadre(
  sectorId: string,
  id: string | null,
  input: MasterDataInput,
): Promise<ActionResult> {
  try {
    /* The sector travels only on create: moving a cadre between employing
       bodies would silently rewrite what every customer under it does, and the
       API refuses it. */
    if (id) await updateSectorCategory(id, input);
    else await createSectorCategory({ ...input, sectorId });
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(ADMIN_PATH);

  return { ok: true, message: id ? `${input.name} updated.` : `${input.name} added.` };
}

export async function removeCadre(id: string, name: string): Promise<ActionResult> {
  try {
    await deleteSectorCategory(id);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(ADMIN_PATH);

  return { ok: true, message: `${name} removed.` };
}
