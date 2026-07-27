import "server-only";
import type { NidaLookupResult } from "@/types/customer";

/**
 * Stands in for the real NIDA registry integration (backend spec §9 —
 * "NIDA ndiyo source ya truth", data never hand-typed). Deterministic: the
 * same NIDA number always resolves to the same simulated identity, so the
 * wizard demo is repeatable and OTP verification has something stable to
 * check against.
 */
const FIRST_NAMES_M = ["Juma", "Hassan", "Mussa", "Salum", "Ally", "Rashid", "Omari", "Baraka"];
const FIRST_NAMES_F = ["Fatuma", "Zainabu", "Halima", "Mariam", "Neema", "Rehema", "Salma", "Amina"];
const LAST_NAMES = ["Mwakalinga", "Kimaro", "Mushi", "Kessy", "Mollel", "Mbwana", "Komba", "Ngowi"];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function simulateNidaLookup(nidaNumber: string): NidaLookupResult {
  const hash = hashString(nidaNumber);
  const gender: "male" | "female" = hash % 2 === 0 ? "male" : "female";
  const firstNames = gender === "male" ? FIRST_NAMES_M : FIRST_NAMES_F;
  const firstName = firstNames[hash % firstNames.length];
  const lastName = LAST_NAMES[(hash >> 3) % LAST_NAMES.length];
  const birthYear = 1965 + (hash % 40);
  const birthMonth = 1 + ((hash >> 5) % 12);
  const birthDay = 1 + ((hash >> 8) % 28);

  return {
    firstName,
    middleName: null,
    lastName,
    dob: `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`,
    gender,
  };
}

/** A fixed OTP for the mock flow — real backend would dispatch via NIDA/SMS. */
export const MOCK_OTP = "123456";
