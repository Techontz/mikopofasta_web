import "server-only";
import { mockRequest } from "@/lib/api/client";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import type { Branch } from "@/types/branch";

/** Future: GET /api/v1/branches (backend spec §15, standard CRUD pattern). */
export async function getBranches(): Promise<Branch[]> {
  const { data } = await mockRequest<Branch[]>(() => MOCK_BRANCHES);
  return data;
}
