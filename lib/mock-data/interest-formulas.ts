import type { InterestFormula } from "@/types/loan-product";

export const MOCK_INTEREST_FORMULAS: InterestFormula[] = [
  { id: "if-simple", name: "Simple Formula", code: "SIMPLE", description: "Interest computed once on the original principal for the full tenure.", deletedAt: null },
  { id: "if-flat", name: "Flat Rate Formula", code: "FLAT", description: "Interest charged per installment on the original principal.", deletedAt: null },
  { id: "if-reducing", name: "Reducing Formula", code: "REDUCING", description: "Interest charged per installment on the outstanding balance.", deletedAt: null },
];
