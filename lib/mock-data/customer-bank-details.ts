import { customerFullName, type CustomerBankDetails } from "@/types/customer";
import { createRng, intBetween, pick } from "@/lib/domain/rng";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";

const BANKS = ["NMB", "CRDB", "NBC", "Equity Bank"];

const rng = createRng(20260702);

export const MOCK_CUSTOMER_BANK_DETAILS: CustomerBankDetails[] = MOCK_CUSTOMERS.filter((c) => c.kycStatus === "completed").map(
  (customer, i) => ({
    id: `cbd-${i + 1}`,
    customerId: customer.id,
    bankName: pick(rng, BANKS),
    accountNumber: String(intBetween(rng, 10_000_000, 99_999_999)),
    accountName: customerFullName(customer),
    checkNumber: null,
    phoneNumber: customer.phone,
  })
);
