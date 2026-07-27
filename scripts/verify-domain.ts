/**
 * Standalone integrity check for the Phase 1.5 domain layer + mock
 * database. Not part of the app — run with `npx tsx scripts/verify-domain.ts`.
 * Proves the seed data actually executes and is internally consistent
 * (referential integrity + ledger balance), which `next build` alone can't
 * confirm since nothing in the UI imports this data yet.
 */
import * as M from "../lib/mock-data/index";
import { accountTypeOf } from "../lib/mock-data/chart-of-accounts";
import { getKycChecklist } from "../types/customer";

let failures = 0;
function check(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  }
}
function count(label: string, n: number) {
  console.log(`  ${label}: ${n}`);
}

console.log("=== Collection counts ===");
count("Regions", M.REGIONS.length);
count("Zones", M.ZONES.length);
count("Branches", M.MOCK_BRANCHES.length);
count("Users", M.MOCK_USERS.length);
count("Bank accounts", M.MOCK_BANK_ACCOUNTS.length);
count("Expense categories", M.MOCK_EXPENSE_CATEGORIES.length);
count("Interest formulas", M.MOCK_INTEREST_FORMULAS.length);
count("Repayment schedules", M.MOCK_REPAYMENT_SCHEDULES.length);
count("Customer categories", M.MOCK_CUSTOMER_CATEGORIES.length);
count("Loan products", M.MOCK_LOAN_PRODUCTS.length);
count("Customers", M.MOCK_CUSTOMERS.length);
count("Customer bank details", M.MOCK_CUSTOMER_BANK_DETAILS.length);
count("Groups", M.MOCK_GROUPS.length);
count("Group members", M.MOCK_GROUP_MEMBERS.length);
count("Chart of accounts", M.CHART_OF_ACCOUNTS.length);
count("Loans", M.MOCK_LOANS.length);
count("Loan schedules (post-payment)", M.MOCK_LOAN_SCHEDULES.length);
count("Loan status history", M.MOCK_LOAN_STATUS_HISTORY.length);
count("E-Mandates", M.MOCK_E_MANDATES.length);
count("Telco verifications", M.MOCK_TELCO_VERIFICATIONS.length);
count("Disbursement batches", M.MOCK_DISBURSEMENT_BATCHES.length);
count("Payments", M.MOCK_PAYMENTS.length);
count("Payment allocations", M.MOCK_PAYMENT_ALLOCATIONS.length);
count("Suspense items", M.MOCK_SUSPENSE_ITEMS.length);
count("Journal entries", M.MOCK_JOURNAL_ENTRIES.length);
count("Journal entry lines", M.MOCK_JOURNAL_ENTRY_LINES.length);
count("Staff profiles", M.MOCK_STAFF_PROFILES.length);
count("Staff loans", M.MOCK_STAFF_LOANS.length);
count("Staff advances", M.MOCK_STAFF_ADVANCES.length);
count("Commission pools", M.MOCK_COMMISSION_POOLS.length);
count("Commission distributions", M.MOCK_COMMISSION_DISTRIBUTIONS.length);
count("Zone commission distributions", M.MOCK_ZONE_COMMISSION_DISTRIBUTIONS.length);
count("Payroll runs", M.MOCK_PAYROLL_RUNS.length);
count("Payroll lines", M.MOCK_PAYROLL_LINES.length);
count("Audit logs", M.MOCK_AUDIT_LOGS.length);
count("Customer risk scores", M.MOCK_CUSTOMER_RISK_SCORES.length);

console.log("\n=== Referential integrity ===");
const branchIds = new Set(M.MOCK_BRANCHES.map((b) => b.id));
const customerIds = new Set(M.MOCK_CUSTOMERS.map((c) => c.id));
const productIds = new Set(M.MOCK_LOAN_PRODUCTS.map((p) => p.id));
const scheduleTypeIds = new Set(M.MOCK_REPAYMENT_SCHEDULES.map((s) => s.id));
const categoryIds = new Set(M.MOCK_CUSTOMER_CATEGORIES.map((c) => c.id));
const loanIds = new Set(M.MOCK_LOANS.map((l) => l.id));
const userIds = new Set(M.MOCK_USERS.map((u) => u.id));
const accountIds = new Set(M.CHART_OF_ACCOUNTS.map((a) => a.id));
const entryIds = new Set(M.MOCK_JOURNAL_ENTRIES.map((e) => e.id));
const staffIds = new Set(M.MOCK_STAFF_PROFILES.map((s) => s.id));
const paymentIds = new Set(M.MOCK_PAYMENTS.map((p) => p.id));

for (const branch of M.MOCK_BRANCHES) {
  if (branch.regionId) check(new Set(M.REGIONS.map((r) => r.id)).has(branch.regionId), `Branch ${branch.id} has unknown regionId`);
  if (branch.zoneId) check(new Set(M.ZONES.map((z) => z.id)).has(branch.zoneId), `Branch ${branch.id} has unknown zoneId`);
}
for (const customer of M.MOCK_CUSTOMERS) {
  check(branchIds.has(customer.branchId), `Customer ${customer.id} has unknown branchId`);
  if (customer.customerCategoryId) check(categoryIds.has(customer.customerCategoryId), `Customer ${customer.id} has unknown customerCategoryId`);
}
for (const loan of M.MOCK_LOANS) {
  check(customerIds.has(loan.customerId), `Loan ${loan.id} has unknown customerId`);
  check(productIds.has(loan.loanProductId), `Loan ${loan.id} has unknown loanProductId`);
  check(scheduleTypeIds.has(loan.repaymentScheduleId), `Loan ${loan.id} has unknown repaymentScheduleId`);
  check(branchIds.has(loan.branchId), `Loan ${loan.id} has unknown branchId`);
  check(userIds.has(loan.officerId), `Loan ${loan.id} has unknown officerId`);
}
for (const schedule of M.MOCK_LOAN_SCHEDULES) {
  check(loanIds.has(schedule.loanId), `Loan schedule ${schedule.id} has unknown loanId`);
}
for (const payment of M.MOCK_PAYMENTS) {
  if (payment.loanId) check(loanIds.has(payment.loanId), `Payment ${payment.id} has unknown loanId`);
  if (payment.customerId) check(customerIds.has(payment.customerId), `Payment ${payment.id} has unknown customerId`);
}
for (const alloc of M.MOCK_PAYMENT_ALLOCATIONS) {
  check(paymentIds.has(alloc.paymentId), `Payment allocation ${alloc.id} has unknown paymentId`);
  check(M.MOCK_LOAN_SCHEDULES.some((s) => s.id === alloc.loanScheduleId), `Payment allocation ${alloc.id} has unknown loanScheduleId`);
}
for (const line of M.MOCK_JOURNAL_ENTRY_LINES) {
  check(entryIds.has(line.journalEntryId), `Journal entry line ${line.id} has unknown journalEntryId`);
  check(accountIds.has(line.accountId), `Journal entry line ${line.id} has unknown accountId`);
  if (line.staffProfileId) check(staffIds.has(line.staffProfileId), `Journal entry line ${line.id} has unknown staffProfileId`);
  if (line.loanId) check(loanIds.has(line.loanId), `Journal entry line ${line.id} has unknown loanId`);
}
for (const profile of M.MOCK_STAFF_PROFILES) {
  check(userIds.has(profile.userId), `Staff profile ${profile.id} has unknown userId`);
}
console.log(failures === 0 ? "  All foreign keys resolve." : `  ${failures} referential integrity failure(s) so far.`);

console.log("\n=== Ledger balance (every journal entry, independently re-verified) ===");
let unbalancedCount = 0;
for (const entry of M.MOCK_JOURNAL_ENTRIES) {
  const lines = M.MOCK_JOURNAL_ENTRY_LINES.filter((l) => l.journalEntryId === entry.id);
  const debit = Math.round(lines.reduce((sum, l) => sum + l.debitAmount, 0) * 100) / 100;
  const credit = Math.round(lines.reduce((sum, l) => sum + l.creditAmount, 0) * 100) / 100;
  if (Math.abs(debit - credit) > 0.01) {
    unbalancedCount++;
    console.error(`  FAIL: entry ${entry.id} (${entry.description}) debit=${debit} credit=${credit}`);
  }
}
check(unbalancedCount === 0, `${unbalancedCount} unbalanced journal entries`);
console.log(`  Checked ${M.MOCK_JOURNAL_ENTRIES.length} entries, ${M.MOCK_JOURNAL_ENTRY_LINES.length} lines.`);

console.log("\n=== Trial balance (all accounts, system-wide) ===");
let trialDebit = 0;
let trialCredit = 0;
for (const line of M.MOCK_JOURNAL_ENTRY_LINES) {
  trialDebit += line.debitAmount;
  trialCredit += line.creditAmount;
}
trialDebit = Math.round(trialDebit * 100) / 100;
trialCredit = Math.round(trialCredit * 100) / 100;
console.log(`  Total debits:  ${trialDebit.toLocaleString()}`);
console.log(`  Total credits: ${trialCredit.toLocaleString()}`);
check(Math.abs(trialDebit - trialCredit) < 0.01, `Trial balance does not balance: debit=${trialDebit} credit=${trialCredit}`);

console.log("\n=== Sample account balances ===");
for (const account of M.SYSTEM_ACCOUNTS.slice(0, 8)) {
  const lines = M.MOCK_JOURNAL_ENTRY_LINES.filter((l) => l.accountId === account.id);
  const debit = lines.reduce((sum, l) => sum + l.debitAmount, 0);
  const credit = lines.reduce((sum, l) => sum + l.creditAmount, 0);
  const type = accountTypeOf(account.id);
  const balance = (type === "asset" || type === "expense" ? debit - credit : credit - debit).toLocaleString();
  console.log(`  ${account.code} ${account.name}: ${balance}`);
}

console.log("\n=== KYC checklist sanity (spot check) ===");
const sampleCustomer = M.MOCK_CUSTOMERS.find((c) => c.kycStatus === "completed")!;
const checklist = getKycChecklist(sampleCustomer, M.MOCK_CUSTOMER_BANK_DETAILS.some((b) => b.customerId === sampleCustomer.id));
console.log(`  ${sampleCustomer.customerNumber}:`, checklist);
check(Object.values(checklist).every(Boolean), `Expected a fully-completed sample customer's checklist to be all true`);

console.log(failures === 0 ? "\n✅ ALL CHECKS PASSED" : `\n❌ ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
