import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { ZONES } from "@/lib/mock-data/zones";
import { REGIONS } from "@/lib/mock-data/regions";
import { UsersTable } from "@/features/admin/users/users-table";

export default function UsersPage() {
  return <UsersTable users={MOCK_USERS} branches={MOCK_BRANCHES} zones={ZONES} regions={REGIONS} />;
}
