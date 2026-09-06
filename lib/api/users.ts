import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { ApiPagination } from "@/lib/api/types";
import type { Role } from "@/types/auth";
import type { User } from "@/types/user";
import { collectPages } from "@/lib/api/paginate";

/**
 * User and role administration — Settings → User Management, Roles &
 * Permissions.
 *
 * Both were the last two screens running on `MOCK_USERS`, which is why this
 * module did not exist: the endpoints have been here since Phase 3 and nothing
 * called them. Nothing was added to the API for this.
 *
 * `users.manage` gates every write and the listing; `roles.view` reads the
 * matrix and `roles.manage` edits it. All of that is decided by UserPolicy and
 * RolePolicy — nothing here re-decides it, because a second answer can only
 * drift from the server's.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface UserFilters {
  search?: string;
  status?: string;
  role?: Role;
  branchId?: string;
  /** Soft-deleted accounts are excluded unless asked for. */
  includeDeleted?: boolean;
  page?: number;
  perPage?: number;
}

export interface UserList {
  users: User[];
  pagination?: ApiPagination;
}

export async function getUsers(filters: UserFilters = {}): Promise<UserList> {
  const { data, meta } = await apiRequest<User[]>("/api/v1/users", {
    token: await token(),
    query: {
      search: filters.search,
      status: filters.status,
      role: filters.role,
      branch_id: filters.branchId,
      include_deleted: filters.includeDeleted ? 1 : undefined,
      page: filters.page,
      per_page: filters.perPage,
    },
  });

  return { users: data, pagination: meta?.pagination };
}

/**
 * Every user, across pages.
 *
 * The table filters, sorts and pages in the browser over the whole set — the
 * staff book is bounded by headcount, not by transaction volume, so a company
 * with two hundred employees is two requests and not a scrolling problem. The
 * page cap stops that assumption becoming an unbounded loop if it ever stops
 * being true.
 */
const PER_PAGE = 100;
const PAGE_LIMIT = 20;

export async function getAllUsers(filters: UserFilters = {}): Promise<User[]> {
  return collectPages(
    async (page, perPage) => {
      const { users, pagination } = await getUsers({ ...filters, page, perPage });
      return { items: users, pagination };
    },
    { pageLimit: PAGE_LIMIT, perPage: PER_PAGE, label: "getAllUsers" }
  );
}

export async function getUser(id: string): Promise<User> {
  return apiData<User>(`/api/v1/users/${id}`, { token: await token() });
}

export interface UserInput {
  name: string;
  phone: string;
  email?: string | null;
  role: Role;
  branchId?: string | null;
  zoneId?: string | null;
  regionId?: string | null;
  /** Required on create; omitted on update leaves the existing one. */
  password?: string;
  extraPermissions?: string[];
}

export async function createUserRequest(input: UserInput): Promise<User> {
  return apiData<User>("/api/v1/users", {
    method: "POST",
    token: await token(),
    body: input,
  });
}

export async function updateUserRequest(id: string, input: Partial<UserInput>): Promise<User> {
  return apiData<User>(`/api/v1/users/${id}`, {
    method: "PUT",
    token: await token(),
    body: input,
  });
}

/**
 * Suspend or reactivate.
 *
 * A separate endpoint from the update, because §14 treats revoking access as a
 * different act from correcting a phone number — and it is the one an auditor
 * asks about.
 */
export async function setUserStatusRequest(id: string, status: string): Promise<User> {
  return apiData<User>(`/api/v1/users/${id}/status`, {
    method: "PATCH",
    token: await token(),
    body: { status },
  });
}

/** Soft-deletes; the account keeps its history and can be restored. */
export async function deleteUserRequest(id: string): Promise<void> {
  await apiData(`/api/v1/users/${id}`, { method: "DELETE", token: await token() });
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export interface RoleRecord {
  id: string;
  name: Role;
  label: string;
  description: string;
  /** False for super_admin, whose grants are fixed. */
  editable: boolean;
  permissions: string[];
  userCount?: number;
}

export async function getRoles(): Promise<RoleRecord[]> {
  return apiData<RoleRecord[]>("/api/v1/roles", { token: await token() });
}

export async function getRole(id: string): Promise<RoleRecord> {
  return apiData<RoleRecord>(`/api/v1/roles/${id}`, { token: await token() });
}

/**
 * Replaces a role's grants wholesale.
 *
 * A whole set rather than a diff: two administrators editing the matrix at once
 * would otherwise interleave adds and removes into a combination neither of
 * them chose.
 */
export async function updateRolePermissionsRequest(
  id: string,
  permissions: string[]
): Promise<RoleRecord> {
  return apiData<RoleRecord>(`/api/v1/roles/${id}/permissions`, {
    method: "PUT",
    token: await token(),
    body: { permissions },
  });
}
