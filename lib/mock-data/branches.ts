import type { Branch } from "@/types/branch";

/**
 * Seed branches. Shape matches the future `GET /api/v1/branches` response
 * (backend spec §15, standard CRUD pattern) so lib/api/branches.ts can be
 * repointed at the real endpoint later without changing its return type.
 */
export const MOCK_BRANCHES: Branch[] = [
  {
    id: "br-hq",
    name: "Head Office",
    regionId: "region-mwanza",
    zoneId: null,
    phone: "0700000001",
    type: "main",
    parentBranchId: null,
    isHeadOffice: true,
    status: "active",
    createdBy: null,
    deletedAt: null,
  },
  {
    id: "br-kakonko",
    name: "Kakonko",
    regionId: "region-kigoma",
    zoneId: "zone-west",
    phone: "0700000002",
    type: "main",
    parentBranchId: null,
    isHeadOffice: false,
    status: "active",
    createdBy: null,
    deletedAt: null,
  },
  {
    id: "br-missenyi",
    name: "Missenyi",
    regionId: "region-kagera",
    zoneId: "zone-west",
    phone: "0700000003",
    type: "main",
    parentBranchId: null,
    isHeadOffice: false,
    status: "active",
    createdBy: null,
    deletedAt: null,
  },
  {
    id: "br-lindi",
    name: "Lindi",
    regionId: "region-lindi",
    zoneId: "zone-east",
    phone: "0700000004",
    type: "main",
    parentBranchId: null,
    isHeadOffice: false,
    status: "active",
    createdBy: null,
    deletedAt: null,
  },
  {
    id: "br-kalenge",
    name: "NEW KALENGE",
    regionId: "region-mbeya",
    zoneId: "zone-east",
    phone: "0700000005",
    type: "sub",
    parentBranchId: "br-lindi",
    isHeadOffice: false,
    status: "active",
    createdBy: null,
    deletedAt: null,
  },
];
