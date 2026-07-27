import type { Guarantor } from "@/types/guarantor";
import { GUARANTOR_RELATIONSHIPS } from "@/types/enums";
import { createRng, dateOnlyDaysAgo, intBetween, pick } from "@/lib/domain/rng";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";

const FIRST_NAMES = ["Peter", "John", "Grace", "Esther", "Daniel", "Rose", "Michael", "Agnes", "Frank", "Lucy"];
const LAST_NAMES = ["Mwakalinga", "Kimaro", "Mushi", "Kessy", "Mollel", "Mbwana", "Komba", "Ngowi"];

function generateGuarantors(): Guarantor[] {
  const rng = createRng(20260702);
  const guarantors: Guarantor[] = [];
  let seq = 1;

  for (const customer of MOCK_CUSTOMERS) {
    if (customer.kycStatus !== "completed" || rng() > 0.6) continue;
    const guarantorCount = rng() > 0.7 ? 2 : 1;
    for (let g = 0; g < guarantorCount; g++) {
      guarantors.push({
        id: `guar-${seq}`,
        customerId: customer.id,
        name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
        phone: `07${intBetween(rng, 50, 69)}${String(intBetween(rng, 100000, 999999)).padStart(6, "0")}`,
        nidaNumber: rng() > 0.3 ? `19${intBetween(rng, 60, 99)}${String(intBetween(rng, 1, 12)).padStart(2, "0")}${String(intBetween(rng, 1, 28)).padStart(2, "0")}-${intBetween(rng, 10000, 99999)}-${intBetween(rng, 10000, 99999)}-${intBetween(rng, 10, 99)}` : null,
        relationship: pick(rng, GUARANTOR_RELATIONSHIPS),
        address: rng() > 0.4 ? "Kinondoni, Dar es Salaam" : null,
        occupation: rng() > 0.4 ? pick(rng, ["Teacher", "Trader", "Driver", "Farmer", "Nurse"]) : null,
        createdAt: dateOnlyDaysAgo(intBetween(rng, 20, 400)),
      });
      seq++;
    }
  }
  return guarantors;
}

export const MOCK_GUARANTORS: Guarantor[] = generateGuarantors();
