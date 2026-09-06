import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { ApiPagination } from "@/lib/api/types";
import { collectPages } from "@/lib/api/paginate";

/**
 * Village banking groups — sidebar → Group.
 *
 * The endpoints have existed since the Customers phase and nothing called them;
 * both group screens were drawn from `LEGACY_GROUPS`, a list of names read off
 * the legacy screen. Nothing was added to the API for this.
 *
 * `customers.view` reads, `customers.manage` writes — GroupPolicy's, and §13
 * branch scope applies, so an officer sees their own branch's groups.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

/**
 * A group as the API returns it.
 *
 * Richer than the legacy screen, which carried a name and nothing else. The
 * committee is derived from the membership rows rather than stored on the
 * group, so it cannot disagree with who actually holds office.
 */
export interface GroupRecord {
  id: string;
  name: string;
  branchId: string;
  branchName?: string | null;
  status: string;
  meetingDay: string | null;
  meetingTime: string | null;
  leader: string | null;
  secretary: string | null;
  treasurer: string | null;
  memberCount?: number;
  /**
   * Derived from the loan schedules of the group's members. The index attaches
   * it after paging — computing it for every group would load the whole loan
   * book to render one page.
   */
  outstandingBalance?: string;
  members?: GroupMemberRecord[];
  createdAt: string | null;
}

export interface GroupMemberRecord {
  id: string;
  customerId: string;
  customerName?: string | null;
  customerNumber?: string | null;
  phone?: string | null;
  role: string;
  roleLabel: string;
  joinedAt: string;
  status: string;
}

export interface GroupFilters {
  search?: string;
  branchId?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

export async function getGroups(
  filters: GroupFilters = {}
): Promise<{ groups: GroupRecord[]; pagination?: ApiPagination }> {
  const { data, meta } = await apiRequest<GroupRecord[]>("/api/v1/groups", {
    token: await token(),
    query: {
      search: filters.search,
      branch_id: filters.branchId,
      status: filters.status,
      page: filters.page,
      per_page: filters.perPage,
    },
  });

  return { groups: data, pagination: meta?.pagination };
}

/**
 * Every group, across pages.
 *
 * Groups are bounded by branch count times a handful each — a village banking
 * book is tens, not thousands — so the screens read the whole set and search
 * and sort it in the browser. The page cap stops that assumption becoming an
 * unbounded loop if it ever stops being true.
 */
const PER_PAGE = 100;
const PAGE_LIMIT = 20;

export async function getAllGroups(filters: GroupFilters = {}): Promise<GroupRecord[]> {
  return collectPages(
    async (page, perPage) => {
      const { groups, pagination } = await getGroups({ ...filters, page, perPage });
      return { items: groups, pagination };
    },
    { pageLimit: PAGE_LIMIT, perPage: PER_PAGE, label: "getAllGroups" }
  );
}

/** Eager-loads the membership, so the committee and the balance resolve. */
export async function getGroup(id: string): Promise<GroupRecord> {
  return apiData<GroupRecord>(`/api/v1/groups/${id}`, { token: await token() });
}

export interface GroupInput {
  name: string;
  branchId: string;
  meetingDay?: string | null;
  meetingTime?: string | null;
}

export async function createGroupRequest(input: GroupInput): Promise<GroupRecord> {
  return apiData<GroupRecord>("/api/v1/groups", {
    method: "POST",
    token: await token(),
    body: input,
  });
}

export async function updateGroupRequest(id: string, input: GroupInput): Promise<GroupRecord> {
  return apiData<GroupRecord>(`/api/v1/groups/${id}`, {
    method: "PUT",
    token: await token(),
    body: input,
  });
}

export async function deleteGroupRequest(id: string): Promise<void> {
  await apiData(`/api/v1/groups/${id}`, { method: "DELETE", token: await token() });
}
