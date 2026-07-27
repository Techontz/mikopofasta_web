import type { User } from "@/types/user";
import type { AuthenticatedUser } from "@/types/auth";
import { PERMISSIONS } from "@/types/auth";

/**
 * Seed credential + profile records for mock authentication (Phase 1 only).
 * `password` is plaintext on purpose — this is a dev-only mock login and is
 * replaced entirely by real Sanctum authentication per
 * docs/frontend-technical-specification.md §2.
 *
 * One user per role — see docs/demo-accounts.md for the full roster with
 * credentials and permission summaries kept in sync with this file.
 *
 * Every user is assigned a concrete home branch, including HQ-wide roles
 * (they're based at Head Office — `br-hq` — per backend spec §12 Decision 2:
 * HQ is a branch, not a separate entity). Cross-branch visibility is decided
 * purely by the BRANCHES_VIEW_ALL permission (see BranchSwitcher), never by
 * branchId being absent.
 */
/**
 * The seeded users table plus the two session-only fields. Derives from the
 * domain `User` record so the mock can never drift from the schema in
 * types/user.ts (backend §2.1).
 */
export interface MockCredential extends User {
  password: string;
  extraPermissions: AuthenticatedUser["extraPermissions"];
  avatarInitials: string;
}

type SeedUser = Omit<MockCredential, "email" | "status" | "lastLoginAt" | "createdBy" | "deletedAt">;

const SEED_USERS: SeedUser[] = [
  {
    id: "u-super-admin",
    name: "Amina Juma",
    phone: "0754000001",
    password: "password",
    role: "super_admin",
    branchId: "br-hq",
    zoneId: null,
    regionId: null,
    extraPermissions: [],
    avatarInitials: "AJ",
  },
  {
    id: "u-admin",
    name: "Baraka Mushi",
    phone: "0754000002",
    password: "password",
    role: "admin",
    branchId: "br-hq",
    zoneId: null,
    regionId: null,
    extraPermissions: [],
    avatarInitials: "BM",
  },
  {
    id: "u-finance",
    name: "Catherine Massawe",
    phone: "0754000003",
    password: "password",
    role: "finance",
    branchId: "br-hq",
    zoneId: null,
    regionId: null,
    extraPermissions: [],
    avatarInitials: "CM",
  },
  {
    id: "u-branch-manager",
    name: "Daniel Kessy",
    phone: "0754000004",
    password: "password",
    role: "branch_manager",
    branchId: "br-kakonko",
    zoneId: null,
    regionId: null,
    extraPermissions: [],
    avatarInitials: "DK",
  },
  {
    id: "u-loan-officer",
    name: "Esther Mollel",
    phone: "0754000005",
    password: "password",
    role: "loan_officer",
    branchId: "br-kakonko",
    zoneId: null,
    regionId: null,
    extraPermissions: [],
    avatarInitials: "EM",
  },
  {
    id: "u-credit-officer",
    name: "Frank Urio",
    phone: "0754000006",
    password: "password",
    role: "credit_officer",
    branchId: "br-missenyi",
    zoneId: null,
    regionId: null,
    extraPermissions: [],
    avatarInitials: "FU",
  },
  {
    id: "u-hr",
    name: "Grace Mbwana",
    phone: "0754000007",
    password: "password",
    role: "hr",
    branchId: "br-hq",
    zoneId: null,
    regionId: null,
    extraPermissions: [],
    avatarInitials: "GM",
  },
  {
    id: "u-zone-manager",
    name: "Hamisi Ally",
    phone: "0754000008",
    password: "password",
    role: "zone_manager",
    branchId: "br-kakonko",
    zoneId: "zone-west",
    regionId: null,
    // Demonstrates backend spec Decision 1: cross-branch loan review is an
    // explicit additional grant, never implied by the zone_manager role itself.
    extraPermissions: [PERMISSIONS.LOANS_REVIEW_CROSS_BRANCH],
    avatarInitials: "HA",
  },
  {
    id: "u-regional-manager",
    name: "Irene Komba",
    phone: "0754000009",
    password: "password",
    role: "regional_manager",
    branchId: "br-missenyi",
    zoneId: null,
    regionId: "region-kagera",
    extraPermissions: [],
    avatarInitials: "IK",
  },
  {
    id: "u-teller",
    name: "Joseph Mrema",
    phone: "0754000010",
    password: "password",
    role: "teller",
    branchId: "br-lindi",
    zoneId: null,
    regionId: null,
    extraPermissions: [],
    avatarInitials: "JM",
  },
  {
    id: "u-auditor",
    name: "Khadija Ramadhani",
    phone: "0754000011",
    password: "password",
    role: "auditor",
    branchId: "br-hq",
    zoneId: null,
    regionId: null,
    extraPermissions: [],
    avatarInitials: "KR",
  },
];

export const MOCK_USERS: MockCredential[] = SEED_USERS.map((u, i) => ({
  ...u,
  email: `${u.name.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, ".")}@mikopofasta.co.tz`,
  status: "active",
  lastLoginAt: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
  createdBy: i === 0 ? null : "u-super-admin",
  deletedAt: null,
}));

export function findUserByPhone(phone: string): MockCredential | undefined {
  return MOCK_USERS.find((u) => u.phone === phone && u.status === "active");
}
