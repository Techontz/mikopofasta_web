import type { AccountFreeze } from "@/types/audit";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { dateOnlyDaysAgo } from "@/lib/domain/rng";

function generateAccountFreezes(): AccountFreeze[] {
  const freezes: AccountFreeze[] = [];
  let seq = 1;

  for (const customer of MOCK_CUSTOMERS) {
    if (customer.status !== "frozen") continue;
    freezes.push({
      id: `freeze-${seq}`,
      freezableType: "customer",
      freezableId: customer.id,
      reason: "Flagged for suspicious activity pending investigation.",
      frozenBy: "u-branch-manager",
      frozenAt: dateOnlyDaysAgo(15),
      unfrozenBy: null,
      unfrozenAt: null,
    });
    seq++;
  }
  return freezes;
}

export const MOCK_ACCOUNT_FREEZES: AccountFreeze[] = generateAccountFreezes();
