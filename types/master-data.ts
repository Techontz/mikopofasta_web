/**
 * The admin-managed lookup lists, and the shape one row of any of them has.
 *
 * WHY THIS IS NOT IN lib/api/master-data.ts, where it used to be. That module
 * opens with `import "server-only"`, which is correct — it reads the API with
 * the session's token and must never be bundled into the browser. Types
 * imported from it are erased at build time and cost nothing, but the list of
 * slugs is now needed as a VALUE in the browser: a customer type's registration
 * field declares which list it draws its choices from, and the administration
 * screen has to offer those slugs in a dropdown.
 *
 * So the contract moved here, where both sides can see it, and the server
 * module re-exports it so nothing that already imports from there had to change.
 */

/**
 * Every list the master-data routes serve whole.
 *
 * `sector-categories` is deliberately absent: its rows belong to a parent
 * sector and it is fetched one sector at a time. It is a valid DATA SOURCE for
 * a registration field — see DYNAMIC_DATA_SOURCES in types/customer.ts — just
 * not a list that can be handed over in full.
 */
export const MASTER_DATA_LISTS = [
  "loan-types",
  "customer-types",
  "account-types",
  "work-types",
  "employment-types",
  "occupations",
  "banks",
  "mobile-money-providers",
  "marital-statuses",
  /* KYC document types — what a category's required documents name. */
  "document-types",
  /* Which identity document was seen, and on what terms somebody is employed
     — see the API's 2026_08_30 migrations. */
  "id-types",
  "contract-types",
  /* The employing body. Its cadres are NOT a flat list. */
  "sectors",
  /* Private companies. A SEPARATE list from `sectors`: a ministry has cadres
     inside it and a company does not, and one list would offer a public
     servant a sugar mill to serve in. */
  "employers",
] as const;

export type MasterDataList = (typeof MASTER_DATA_LISTS)[number];

/** Human wording for a slug, for the administration screens that offer them. */
export const MASTER_DATA_LIST_LABELS: Record<MasterDataList, string> = {
  "loan-types": "Loan Category Names",
  "customer-types": "Customer Legal Forms",
  "account-types": "Account Types",
  "work-types": "Work Types",
  "employment-types": "Employment Types",
  occupations: "Occupations",
  banks: "Banks",
  "mobile-money-providers": "Mobile Money Providers",
  "marital-statuses": "Marital Statuses",
  "document-types": "Document Types",
  "id-types": "ID Types",
  "contract-types": "Contract Types",
  sectors: "Sectors",
  employers: "Employers",
};

export interface MasterDataOption {
  id: string;
  /** Stable machine value. Data references this; the name may be renamed. */
  code: string;
  name: string;
  description: string | null;
  sortOrder: number | null;
  isActive: boolean;
  /**
   * ID Types only — which document type evidences this identity type.
   *
   * It is what lets the registration form put a named upload slot on step 3
   * for the document the officer said they saw, instead of leaving them to
   * pick it out of a list that also holds payslips and bank cards. Absent on
   * every other list, and null on an ID type nobody has linked yet — in which
   * case the form asks for the type and the number and no slot appears.
   */
  documentTypeId?: string | null;
}
