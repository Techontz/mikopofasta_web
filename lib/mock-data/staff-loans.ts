import type { StaffLoan } from "@/types/staff";
import { dateOnlyDaysAgo } from "@/lib/domain/rng";
import { postEntry } from "@/lib/mock-data/journal-entries";
import { STAFF_LOAN_RECEIVABLE_ACCOUNT_ID, SYSTEM_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { staffProfileIdForUser } from "@/lib/mock-data/staff-profiles";

const STAFF_FUND = SYSTEM_ACCOUNTS.find((a) => a.name === "Staff Fund Account")!.id;
const ESTHER_STAFF_ID = staffProfileIdForUser("u-loan-officer");

const entryId = postEntry({
  date: dateOnlyDaysAgo(60),
  description: "Staff loan disbursement — Esther Mollel",
  sourceType: "staff_loan",
  sourceId: "staff-loan-1",
  createdBy: "u-hr",
  lines: [
    { accountId: STAFF_LOAN_RECEIVABLE_ACCOUNT_ID, debit: 500_000, staffProfileId: ESTHER_STAFF_ID },
    { accountId: STAFF_FUND, credit: 500_000, staffProfileId: ESTHER_STAFF_ID },
  ],
});

export const MOCK_STAFF_LOANS: StaffLoan[] = [
  { id: "staff-loan-1", staffProfileId: ESTHER_STAFF_ID, amount: 500_000, status: "active", disbursedAt: dateOnlyDaysAgo(60).slice(0, 10), journalEntryId: entryId },
];
