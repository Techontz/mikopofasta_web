import "server-only";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";

/**
 * Which branches offer a loan product — Administration → Loan Category →
 * Assign Branch.
 *
 * `offeredEverywhere` is true when nothing is assigned, because an empty list
 * means the product is available at every branch rather than none. The screen
 * has to say which.
 */
export interface BranchOption {
  id: string;
  name: string;
}

export interface ProductBranchAssignment {
  product: { id: string; name: string };
  available: BranchOption[];
  assigned: BranchOption[];
  offeredEverywhere: boolean;
}

export async function getProductBranches(productId: string): Promise<ProductBranchAssignment> {
  return apiData<ProductBranchAssignment>(`/api/v1/loan-products/${productId}/branches`, {
    token: await getApiToken(),
  });
}
