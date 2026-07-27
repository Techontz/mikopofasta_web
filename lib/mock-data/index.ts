/**
 * Barrel export for the complete mock database (Phase 1.5 — Enterprise
 * Domain Layer). Every array here mirrors a future `GET /api/v1/...`
 * collection response 1:1 with docs/backend-architecture-specification.md.
 * Import from here for cross-module/report code; import directly from the
 * specific file when a module only needs one entity (keeps bundles lean
 * once this is wired to real pages).
 */

export * from "@/lib/mock-data/regions";
export * from "@/lib/mock-data/districts";
export * from "@/lib/mock-data/wards";
export * from "@/lib/mock-data/streets";
export * from "@/lib/mock-data/zones";
export * from "@/lib/mock-data/branches";
export * from "@/lib/mock-data/users";
export * from "@/lib/mock-data/bank-accounts";
export * from "@/lib/mock-data/expense-categories";
export * from "@/lib/mock-data/interest-formulas";
export * from "@/lib/mock-data/repayment-schedules";
export * from "@/lib/mock-data/customer-categories";
export * from "@/lib/mock-data/loan-products";
export * from "@/lib/mock-data/customers";
export * from "@/lib/mock-data/customer-bank-details";
export * from "@/lib/mock-data/customer-documents";
export * from "@/lib/mock-data/guarantors";
export * from "@/lib/mock-data/next-of-kin";
export * from "@/lib/mock-data/customer-notes";
export * from "@/lib/mock-data/account-freezes";
export * from "@/lib/mock-data/groups";
export * from "@/lib/mock-data/chart-of-accounts";
export * from "@/lib/mock-data/loans";
export * from "@/lib/mock-data/payments";
export * from "@/lib/mock-data/cash-deposits";
export * from "@/lib/mock-data/journal-entries";
export * from "@/lib/mock-data/staff-profiles";
export * from "@/lib/mock-data/staff-loans";
export * from "@/lib/mock-data/staff-advances";
export * from "@/lib/mock-data/commission";
export * from "@/lib/mock-data/payroll";
export * from "@/lib/mock-data/audit-logs";
export * from "@/lib/mock-data/customer-risk-scores";
export * from "@/lib/mock-data/notifications";
export * from "@/lib/mock-data/notification-templates";
export * from "@/lib/mock-data/company-profile";
