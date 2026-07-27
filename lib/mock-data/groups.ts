import type { Group, GroupMember } from "@/types/group";
import { dateOnlyDaysAgo } from "@/lib/domain/rng";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";

const boda = MOCK_CUSTOMERS.filter((c) => c.customerCategoryId === "cat-boda-boda");
const kakonkoCustomers = MOCK_CUSTOMERS.filter((c) => c.branchId === "br-kakonko");
const missenyiCustomers = MOCK_CUSTOMERS.filter((c) => c.branchId === "br-missenyi");

export const MOCK_GROUPS: Group[] = [
  { id: "grp-1", name: "Kakonko Boda Boda Group A", branchId: "br-kakonko", leaderCustomerId: kakonkoCustomers[0]?.id ?? null, status: "active", deletedAt: null },
  { id: "grp-2", name: "Missenyi Wajasiriamali Group", branchId: "br-missenyi", leaderCustomerId: missenyiCustomers[0]?.id ?? null, status: "active", deletedAt: null },
  { id: "grp-3", name: "Boda Boda United", branchId: "br-lindi", leaderCustomerId: boda[0]?.id ?? null, status: "active", deletedAt: null },
];

function membersOf(groupId: string, branchId: string, count: number): GroupMember[] {
  const pool = MOCK_CUSTOMERS.filter((c) => c.branchId === branchId).slice(0, count);
  return pool.map((customer, i) => ({
    id: `gm-${groupId}-${i + 1}`,
    groupId,
    customerId: customer.id,
    joinedAt: dateOnlyDaysAgo(200 - i * 10),
    status: "active",
  }));
}

export const MOCK_GROUP_MEMBERS: GroupMember[] = [
  ...membersOf("grp-1", "br-kakonko", 4),
  ...membersOf("grp-2", "br-missenyi", 3),
  ...membersOf("grp-3", "br-lindi", 3),
];
