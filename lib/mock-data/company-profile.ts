import type { CompanyProfile } from "@/types/organization";

export const MOCK_COMPANY_PROFILE: CompanyProfile = {
  id: "company-profile",
  legalName: "Mikopofasta Microfinance Limited",
  tradingName: "Mikopofasta",
  registrationNumber: "REG-2019-004821",
  tinNumber: "109-874-321",
  phone: "0700000001",
  email: "info@mikopofasta.co.tz",
  address: "P.O. Box 1234, Mwanza, Tanzania",
  headquartersBranchId: "br-hq",
  updatedBy: "u-super-admin",
  updatedAt: new Date().toISOString(),
};
