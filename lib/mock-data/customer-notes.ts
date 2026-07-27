import type { CustomerNote } from "@/types/customer-note";
import { createRng, dateOnlyDaysAgo, intBetween, pick } from "@/lib/domain/rng";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";

const AUTHORS = ["u-loan-officer", "u-branch-manager", "u-credit-officer"];
const NOTE_TEMPLATES = [
  "Visited customer's business premises — operating as described.",
  "Customer requested a call back regarding repayment date.",
  "Follow-up needed on missing bank statement.",
  "Customer confirmed change of residence address.",
  "Spoke with customer's guarantor to confirm contact details.",
];

function generateCustomerNotes(): CustomerNote[] {
  const rng = createRng(20260704);
  const notes: CustomerNote[] = [];
  let seq = 1;

  for (const customer of MOCK_CUSTOMERS) {
    if (rng() > 0.4) continue;
    const noteCount = rng() > 0.7 ? 2 : 1;
    for (let n = 0; n < noteCount; n++) {
      notes.push({
        id: `note-${seq}`,
        customerId: customer.id,
        authorId: pick(rng, AUTHORS),
        note: pick(rng, NOTE_TEMPLATES),
        createdAt: dateOnlyDaysAgo(intBetween(rng, 1, 300)),
      });
      seq++;
    }
  }
  return notes;
}

export const MOCK_CUSTOMER_NOTES: CustomerNote[] = generateCustomerNotes();
