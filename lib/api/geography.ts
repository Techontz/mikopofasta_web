import "server-only";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";

/**
 * Administration → Master Data → Geography.
 *
 * The register behind every customer address. The application ships a
 * demonstration subset and contains no Tanzanian place names of its own — the
 * real register is imported here, from a file the institution supplies.
 */

export interface GeographyStatus {
  regions: number;
  districts: number;
  wards: number;
  streets: number;
  /** The CSV header this importer understands, in order. */
  columns: string[];
  maxRows: number;
}

export interface GeographyImportResult {
  rowsRead: number;
  created: Record<string, number>;
  existing: Record<string, number>;
  rejected: { row: number; reason: string }[];
  rejectedCount: number;
}

export async function getGeographyStatus(): Promise<GeographyStatus> {
  return apiData<GeographyStatus>("/api/v1/master-data/geography", {
    token: await getApiToken(),
  });
}
