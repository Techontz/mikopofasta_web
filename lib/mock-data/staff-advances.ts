import type { StaffAdvance } from "@/types/staff";
import { dateOnlyDaysAgo } from "@/lib/domain/rng";
import { postEntry } from "@/lib/mock-data/journal-entries";
import { STAFF_ADVANCE_RECEIVABLE_ACCOUNT_ID, SYSTEM_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { staffProfileIdForUser } from "@/lib/mock-data/staff-profiles";

const STAFF_FUND = SYSTEM_ACCOUNTS.find((a) => a.name === "Staff Fund Account")!.id;
const JOSEPH_STAFF_ID = staffProfileIdForUser("u-teller");

const entryId = postEntry({
  date: dateOnlyDaysAgo(20),
  description: "Staff salary advance — Joseph Mrema",
  sourceType: "staff_advance",
  sourceId: "staff-advance-1",
  createdBy: "u-hr",
  lines: [
    { accountId: STAFF_ADVANCE_RECEIVABLE_ACCOUNT_ID, debit: 150_000, staffProfileId: JOSEPH_STAFF_ID },
    { accountId: STAFF_FUND, credit: 150_000, staffProfileId: JOSEPH_STAFF_ID },
  ],
});

export const MOCK_STAFF_ADVANCES: StaffAdvance[] = [
  {
    id: "staff-advance-1",
    staffProfileId: JOSEPH_STAFF_ID,
    amount: 150_000,
    status: "disbursed",
    requestedAt: dateOnlyDaysAgo(25),
    approvedBy: "u-hr",
    approvedAt: dateOnlyDaysAgo(22),
    disbursedAt: dateOnlyDaysAgo(20),
    journalEntryId: entryId,
  },
];
