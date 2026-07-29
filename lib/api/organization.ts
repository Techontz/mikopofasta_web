import "server-only";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { Branch, District, Region, Street, Ward, Zone } from "@/types/branch";
import type { CompanyProfile, UpdateCompanyProfileInput } from "@/types/organization";

/**
 * Organization — company profile, regions, zones, branches and the geography
 * lookups (backend §2.2, §15 standard CRUD).
 *
 * Reads are open to every authenticated user: the branch switcher, the
 * registration wizard's address cascade and half the forms in the app need
 * these lists, and gating them would break screens whose own permission has
 * already been checked. Writes require `admin.org_settings`, enforced by the
 * API — the actions below surface its 403 rather than deciding for themselves.
 */

/**
 * The API returns a few resolved display names alongside the ids —
 * `regionName`, `zoneName`, `parentBranchName` on a branch; `zoneManagerName`
 * and `branchCount` on a zone. They are additive, so the base types still
 * describe the record; these interfaces capture the extras the tables render
 * so a caller does not have to re-look-up what the server already resolved.
 */
export interface BranchWithNames extends Branch {
  regionName: string | null;
  zoneName: string | null;
  parentBranchName: string | null;
}

export interface ZoneWithCounts extends Zone {
  zoneManagerName: string | null;
  branchCount: number;
}

export interface RegionWithCounts extends Region {
  branchCount: number;
}

/** One node of `GET /branches/hierarchy` — a branch with its sub-branches. */
export interface BranchHierarchyNode {
  branch: BranchWithNames;
  children: BranchHierarchyNode[];
  depth: number;
}

async function token(): Promise<string | undefined> {
  return getApiToken();
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

export interface BranchFilters {
  search?: string;
  status?: string;
  type?: string;
  regionId?: string;
  zoneId?: string;
  includeDeleted?: boolean;
}

/**
 * GET /api/v1/branches
 *
 * Unpaginated by design: the API treats branches as a lookup because the
 * branch switcher and several forms load the whole list, and paginating them
 * by default would silently truncate those callers.
 */
export async function getBranches(filters: BranchFilters = {}): Promise<BranchWithNames[]> {
  return apiData<BranchWithNames[]>("/api/v1/branches", {
    token: await token(),
    query: {
      search: filters.search,
      status: filters.status,
      type: filters.type,
      region_id: filters.regionId,
      zone_id: filters.zoneId,
      include_deleted: filters.includeDeleted ? 1 : undefined,
    },
  });
}

export async function getBranch(id: string): Promise<BranchWithNames> {
  return apiData<BranchWithNames>(`/api/v1/branches/${id}`, { token: await token() });
}

/** GET /api/v1/branches/hierarchy — main branches with their sub-branches nested. */
export async function getBranchHierarchy(): Promise<BranchHierarchyNode[]> {
  return apiData<BranchHierarchyNode[]>("/api/v1/branches/hierarchy", { token: await token() });
}

export interface BranchInput {
  name: string;
  regionId: string | null;
  zoneId: string | null;
  phone: string;
  type: string;
  parentBranchId: string | null;
  status?: string;
}

export async function createBranchRequest(input: BranchInput): Promise<Branch> {
  return apiData<Branch>("/api/v1/branches", { method: "POST", body: input, token: await token() });
}

export async function updateBranchRequest(id: string, input: BranchInput): Promise<Branch> {
  return apiData<Branch>(`/api/v1/branches/${id}`, { method: "PUT", body: input, token: await token() });
}

export async function deleteBranchRequest(id: string): Promise<void> {
  await apiData(`/api/v1/branches/${id}`, { method: "DELETE", token: await token() });
}

/** POST /api/v1/branches/{branch}/head-office — §12's single-HQ move. */
export async function setHeadOfficeRequest(id: string): Promise<Branch> {
  return apiData<Branch>(`/api/v1/branches/${id}/head-office`, { method: "POST", token: await token() });
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export async function getZones(): Promise<ZoneWithCounts[]> {
  return apiData<ZoneWithCounts[]>("/api/v1/zones", { token: await token() });
}

export interface ZoneInput {
  name: string;
  zoneManagerId: string | null;
}

export async function createZoneRequest(input: ZoneInput): Promise<Zone> {
  return apiData<Zone>("/api/v1/zones", { method: "POST", body: input, token: await token() });
}

export async function updateZoneRequest(id: string, input: ZoneInput): Promise<Zone> {
  return apiData<Zone>(`/api/v1/zones/${id}`, { method: "PUT", body: input, token: await token() });
}

export async function deleteZoneRequest(id: string): Promise<void> {
  await apiData(`/api/v1/zones/${id}`, { method: "DELETE", token: await token() });
}

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

export async function getRegions(): Promise<RegionWithCounts[]> {
  return apiData<RegionWithCounts[]>("/api/v1/regions", { token: await token() });
}

export async function createRegionRequest(input: { name: string }): Promise<Region> {
  return apiData<Region>("/api/v1/regions", { method: "POST", body: input, token: await token() });
}

export async function updateRegionRequest(id: string, input: { name: string }): Promise<Region> {
  return apiData<Region>(`/api/v1/regions/${id}`, { method: "PUT", body: input, token: await token() });
}

export async function deleteRegionRequest(id: string): Promise<void> {
  await apiData(`/api/v1/regions/${id}`, { method: "DELETE", token: await token() });
}

// ---------------------------------------------------------------------------
// Geography lookups
// ---------------------------------------------------------------------------

/**
 * The address cascade. Each level filters by its parent, so the registration
 * wizard fetches only what the previous choice makes reachable rather than
 * pulling every street in the country.
 */
export async function getDistricts(regionId?: string): Promise<District[]> {
  return apiData<District[]>("/api/v1/districts", {
    token: await token(),
    query: { region_id: regionId },
  });
}

export async function getWards(districtId?: string): Promise<Ward[]> {
  return apiData<Ward[]>("/api/v1/wards", {
    token: await token(),
    query: { district_id: districtId },
  });
}

export async function getStreets(wardId?: string): Promise<Street[]> {
  return apiData<Street[]>("/api/v1/streets", {
    token: await token(),
    query: { ward_id: wardId },
  });
}

// ---------------------------------------------------------------------------
// Company profile
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/company-profile — a singleton, addressed by the literal id
 * "company-profile" rather than a numeric key.
 */
export async function getCompanyProfile(): Promise<CompanyProfile> {
  return apiData<CompanyProfile>("/api/v1/company-profile", { token: await token() });
}

export async function updateCompanyProfileRequest(
  input: UpdateCompanyProfileInput
): Promise<CompanyProfile> {
  return apiData<CompanyProfile>("/api/v1/company-profile", {
    method: "PUT",
    body: input,
    token: await token(),
  });
}

// ---------------------------------------------------------------------------
// Zone manager candidates
// ---------------------------------------------------------------------------

/**
 * The users a zone may be managed by.
 *
 * Fetched from the real users endpoint rather than mock data because
 * `zones.zone_manager_id` is validated against `users.id` — assigning a mock
 * id like "u-zone-manager" would simply be rejected. Filtered to the
 * zone_manager role, which is who the field is for.
 *
 * Deliberately narrow: this is the Zones form's lookup, not the Users module's
 * list, and it returns only the two fields the dropdown renders.
 */
export async function getZoneManagerCandidates(): Promise<{ id: string; name: string }[]> {
  const users = await apiData<{ id: string; name: string }[]>("/api/v1/users", {
    token: await token(),
    query: { role: "zone_manager", status: "active", per_page: 100 },
  });

  return users.map((user) => ({ id: user.id, name: user.name }));
}
