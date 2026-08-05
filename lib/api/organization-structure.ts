import "server-only";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { OrganizationTier } from "@/types/enums";
import type { Role } from "@/types/auth";

/**
 * The enterprise structure — SUPER ADMIN → HEAD OFFICE → ZONES → BRANCHES.
 *
 * Read from the API rather than assembled here from the branch and zone
 * endpoints. The tier a user sits at is computed from their posting by the same
 * service that decides what they can see, so a client that worked it out from
 * role names would disagree with the data the API then returned to it.
 */

export interface StructureBranch {
  id: string;
  name: string;
  isHeadOffice: boolean;
  parentBranchId: string | null;
}

export interface StructureZone {
  id: string;
  name: string;
  branchCount: number;
  branches: StructureBranch[];
}

export interface OrganizationStructure {
  headOffice: StructureBranch | null;
  zones: StructureZone[];
  /** Branches belonging to no zone — a real state, and usually an oversight. */
  unzonedBranches: StructureBranch[];
  openLoans: number;
  staffByTier: Record<OrganizationTier, number>;
  staffByRole: { role: Role; label: string; count: number }[];
  tiers: { value: OrganizationTier; label: string; scope: string; isOperational: boolean }[];
}

export interface MyPlaceInOrganization {
  tier: OrganizationTier;
  tierLabel: string;
  scopeDescription: string;
  isOperational: boolean;
  branch: { id: string; name: string; isHeadOffice: boolean } | null;
  zoneId: string | null;
  regionId: string | null;
  visibleBranchIds: string[];
  visibleBranchCount: number;
  reportsTo: { tier: string; id: string | null; name: string }[];
}

export async function getOrganizationStructure(): Promise<OrganizationStructure> {
  return apiData<OrganizationStructure>("/api/v1/organization/structure", { token: await getApiToken() });
}

export async function getMyPlaceInOrganization(): Promise<MyPlaceInOrganization> {
  return apiData<MyPlaceInOrganization>("/api/v1/organization/me", { token: await getApiToken() });
}
