import type { InterestFormula } from "@/types/loan-product";

export const MOCK_INTEREST_FORMULAS: InterestFormula[] = [
  { id: "if-simple", name: "Simple Formular", code: "SIMPLE", description: "Interest computed once on the original principal for the full tenure.", deletedAt: null },
  { id: "if-flat", name: "Flat Rate Formular", code: "FLAT", description: "Interest charged per installment on the original principal.", deletedAt: null },
  { id: "if-reducing", name: "Reducing Formular", code: "REDUCING", description: "Interest charged per installment on the outstanding balance.", deletedAt: null },
];
