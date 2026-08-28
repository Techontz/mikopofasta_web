"use server";

import { revalidatePath } from "next/cache";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import { describeError } from "@/lib/api/errors";
import type { GeographyImportResult } from "@/lib/api/geography";

export interface ImportOutcome {
  ok: boolean;
  result?: GeographyImportResult;
  message?: string;
}

/**
 * Uploads the register.
 *
 * The file goes straight through as multipart — nothing is parsed in the
 * browser. The importer is the one place that understands the format, and a
 * second parser here would be a second opinion about what a valid row is.
 */
export async function importGeography(form: FormData): Promise<ImportOutcome> {
  try {
    const result = await apiData<GeographyImportResult>(
      "/api/v1/master-data/geography/import",
      { method: "POST", formData: form, token: await getApiToken() },
    );

    revalidatePath("/admin/geography");

    return { ok: true, result };
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }
}
