import type { NextOfKin } from "@/types/next-of-kin";
import { GUARANTOR_RELATIONSHIPS } from "@/types/enums";
import { createRng, dateOnlyDaysAgo, intBetween, pick } from "@/lib/domain/rng";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";

const FIRST_NAMES = ["Asha", "Joseph", "Catherine", "Vincent", "Beatrice", "Edwin", "Faraja", "Consolata"];
const LAST_NAMES = ["Mwakalinga", "Kimaro", "Mushi", "Kessy", "Mollel", "Mbwana", "Komba", "Ngowi"];

function generateNextOfKin(): NextOfKin[] {
  const rng = createRng(20260703);
  const records: NextOfKin[] = [];
  let seq = 1;

  for (const customer of MOCK_CUSTOMERS) {
    if (customer.kycStatus !== "completed" || rng() > 0.75) continue;
    records.push({
      id: `nok-${seq}`,
      customerId: customer.id,
      name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      relationship: pick(rng, GUARANTOR_RELATIONSHIPS),
      phone: `07${intBetween(rng, 50, 69)}${String(intBetween(rng, 100000, 999999)).padStart(6, "0")}`,
      address: rng() > 0.4 ? "Ilala, Dar es Salaam" : null,
      createdAt: dateOnlyDaysAgo(intBetween(rng, 20, 400)),
    });
    seq++;
  }
  return records;
}

export const MOCK_NEXT_OF_KIN: NextOfKin[] = generateNextOfKin();
