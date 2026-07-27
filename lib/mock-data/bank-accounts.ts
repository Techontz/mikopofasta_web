import type { BankAccount } from "@/types/treasury";
import { BANK_CHART_ACCOUNT_IDS } from "@/lib/mock-data/chart-of-accounts";

export const MOCK_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "bank-nmb",
    bankName: "NMB Bank",
    accountNumber: "20110012345",
    accountName: "Mikopofasta Microfinance Ltd",
    chartAccountId: BANK_CHART_ACCOUNT_IDS.NMB,
    status: "active",
    deletedAt: null,
  },
  {
    id: "bank-crdb",
    bankName: "CRDB Bank",
    accountNumber: "01J1234567800",
    accountName: "Mikopofasta Microfinance Ltd",
    chartAccountId: BANK_CHART_ACCOUNT_IDS.CRDB,
    status: "active",
    deletedAt: null,
  },
];
