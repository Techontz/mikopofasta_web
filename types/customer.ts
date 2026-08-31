import { z } from "zod";
import { MASTER_DATA_LISTS, MASTER_DATA_LIST_LABELS } from "@/types/master-data";
import {
  CUSTOMER_APPROVAL_STATUSES,
  CUSTOMER_CATEGORY_SECTORS,
  CUSTOMER_STATUSES,
  GENDERS,
  KYC_STATUSES,
  MARITAL_STATUSES,
  RESIDENCE_TYPES,
  RISK_TIERS,
} from "@/types/enums";

/** One field in a CustomerCategory's dynamic KYC form (frontend spec §5). */
/**
 * The registration payload keys a configured customer-type field may write to.
 *
 * ONE LIST, THREE READERS, AND THAT IS THE POINT. The form renderer binds a
 * control to these; `registerCustomerRequest` forwards exactly these to the
 * API; and the server validates against its own copy
 * (StructuredRegistrationField). Before this was shared, the outbound request
 * body was a hand-maintained allowlist that had fallen behind the form — seven
 * fields the officer filled in were dropped on the way out, including the ID
 * type and its number, which made the API refuse the registration for having
 * no identity document. A list that has to be updated in two places by hand
 * eventually is not.
 *
 * The value is the label an administrator sees when choosing where an answer is
 * kept; the key is the payload name.
 */
export const STRUCTURED_TARGETS = {
  // Personal detail.
  nickname: "Nickname",
  maritalStatusId: "Marital status",
  dependentsCount: "Number of dependents",
  residenceType: "Residence type",
  alternativePhone: "Alternative phone",
  email: "Email",
  nationality: "Nationality",
  tinNumber: "TIN number",

  // Address detail below the district. The two chosen levels belong to step
  // one and are deliberately not configurable.
  village: "Village",
  houseNumber: "House number",
  postalCode: "Postal code",
  landmark: "Landmark",

  // Where they work, and on what terms.
  sectorId: "Sector",
  sectorCategoryId: "Sector category (cadre)",
  employerId: "Employer (from the list)",
  employer: "Employer (typed)",
  placeOfEmployment: "Place of employment",
  department: "Department",
  councilNumber: "Council number",
  checkNumber: "Check number",
  occupation: "Occupation (typed)",
  occupationId: "Occupation (from the list)",
  workType: "Work type (typed)",
  workTypeId: "Work type (from the list)",
  employmentType: "Employment type (typed)",
  employmentTypeId: "Employment type (from the list)",
  contractTypeId: "Contract type",
  contractExpiryDate: "Contract expiry date",
  retirementDate: "Retirement date",

  // What they earn.
  basicSalary: "Basic salary",
  takeHome: "Take home",
  monthlyIncome: "Monthly income",

  // Their business, for a type that lends against one.
  businessName: "Business name",
  businessType: "Business type",
  businessAddress: "Business address",

  // Where money goes.
  bankId: "Bank",
  bankBranch: "Bank branch",
  mobileMoneyProviderId: "Mobile money provider",
  walletNumber: "Wallet number",
} as const;

export type StructuredTarget = keyof typeof STRUCTURED_TARGETS;

/**
 * The targets typed as `number | null`, which must be written and sent as
 * numbers. A salary submitted as the string "1200000" fails the payload schema
 * at Save, on a field the officer filled in correctly.
 */
export const NUMERIC_STRUCTURED_TARGETS: readonly StructuredTarget[] = [
  "basicSalary",
  "takeHome",
  "monthlyIncome",
  "dependentsCount",
];

/**
 * The targets that hold a master-data row id and must be sent as one.
 *
 * Named by suffix rather than listed, because every id-bearing key in the map
 * ends in `Id` and a new one always will — a hand-kept second list would be the
 * same maintenance trap this whole constant exists to close.
 */
export function isIdTarget(target: string): boolean {
  return target.endsWith("Id");
}

/**
 * How a configured registration field is presented.
 *
 * `currency` is a number shown with a shilling prefix and thousands grouping.
 * It is a separate type from `number` because a form that showed a salary and a
 * dependant count identically would be asking the officer to work out for
 * themselves which one is money. Nothing about the VALUE differs — the API
 * validates both the same way.
 */
export const DYNAMIC_FIELD_TYPES = [
  "text",
  "number",
  "currency",
  "select",
  "date",
  "textarea",
  "boolean",
] as const;
export type DynamicFieldType = (typeof DYNAMIC_FIELD_TYPES)[number];

export const DYNAMIC_FIELD_TYPE_LABELS: Record<DynamicFieldType, string> = {
  text: "Text",
  number: "Number",
  currency: "Currency",
  select: "Select",
  date: "Date",
  textarea: "Long text",
  boolean: "Yes / No",
};

/**
 * Where a select gets its choices.
 *
 * Every admin-managed list, plus `sector-categories` — which is not one of the
 * flat lists because its rows belong to a parent sector, and is exactly the
 * source a dependent dropdown draws from.
 */
export const DYNAMIC_DATA_SOURCES = [...MASTER_DATA_LISTS, "sector-categories"] as const;
export type DynamicDataSource = (typeof DYNAMIC_DATA_SOURCES)[number];

export const DYNAMIC_DATA_SOURCE_LABELS: Record<DynamicDataSource, string> = {
  ...MASTER_DATA_LIST_LABELS,
  "sector-categories": "Sector Categories (depends on a Sector)",
};

/**
 * Where an administrator goes to create the values a data source offers.
 *
 * A configurable form is only configurable if the person configuring it can
 * answer "and where do I add the choices?". Without this, a field pointing at
 * an empty list is a dead end: the administrator sees a dropdown with nothing
 * in it and no idea whether that is a bug, a permission problem, or a screen
 * they have not found. Every source names its screen, in the words the sidebar
 * uses, and the registration form shows the same sentence when a list turns out
 * to be empty at the moment a customer is in front of an officer.
 */
export const DYNAMIC_DATA_SOURCE_ORIGIN: Record<DynamicDataSource, { where: string; href: string }> = {
  "loan-types": { where: "Administration → Master Data → Loan Category Names", href: "/admin/master-data" },
  "customer-types": { where: "Administration → Master Data → Customer Legal Form", href: "/admin/master-data" },
  "account-types": { where: "Administration → Master Data → Account Types", href: "/admin/master-data" },
  "work-types": { where: "Administration → Master Data → Work Types", href: "/admin/master-data" },
  "employment-types": { where: "Administration → Master Data → Employment Types", href: "/admin/master-data" },
  occupations: { where: "Administration → Master Data → Occupations", href: "/admin/master-data" },
  banks: { where: "Administration → Master Data → Banks", href: "/admin/master-data" },
  "mobile-money-providers": { where: "Administration → Master Data → Mobile Money Providers", href: "/admin/master-data" },
  "marital-statuses": { where: "Administration → Master Data → Marital Statuses", href: "/admin/master-data" },
  "document-types": { where: "Administration → Master Data → Document Types", href: "/admin/master-data" },
  "id-types": { where: "Administration → Master Data → ID Types", href: "/admin/master-data" },
  "contract-types": { where: "Administration → Master Data → Contract Types", href: "/admin/master-data" },
  sectors: { where: "Administration → Master Data → Sectors", href: "/admin/master-data" },
  employers: { where: "Administration → Master Data → Employers", href: "/admin/master-data" },
  /* Cadres are created INSIDE their sector, because a cadre with no sector has
     nowhere to belong. Saying "Sectors" alone would send an administrator to a
     screen where the thing they are looking for is one click further in. */
  "sector-categories": {
    where: "Administration → Master Data → Sectors → open a sector → Categories",
    href: "/admin/master-data",
  },
};

/** The sources whose rows belong to a parent, and so can depend on another field. */
export const PARENTED_DATA_SOURCES: readonly DynamicDataSource[] = ["sector-categories"];

/**
 * One field on a customer type's registration form, as an administrator
 * configured it.
 *
 * THE WHOLE POINT IS THAT NOTHING HERE IS A COMPONENT. A field is a row of
 * data; `DynamicFields` reads it and renders it. Adding a question to a
 * customer type — or adding a customer type — is a save on the administration
 * screen, never an edit to this file.
 *
 * `key` decides where the answer is stored. When it names one of the customer's
 * real columns (see structured-fields.ts, and the API's
 * StructuredRegistrationField) the value goes to that column and stays
 * queryable; anything else lands in `dynamicFormData`. So "Basic Salary" is
 * still on the payroll report and "Land Size" needs no migration.
 */
export const DynamicFormFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(DYNAMIC_FIELD_TYPES),
  required: z.boolean(),
  /** A select's fixed choices, when it does not draw from a list. */
  options: z.array(z.string()).nullish(),
  /** A select's admin-managed list, which is the usual case. */
  dataSource: z.enum(DYNAMIC_DATA_SOURCES).nullish(),
  /**
   * The field this one follows.
   *
   * Changing that field always clears THIS field's answer, which is what makes
   * a stale answer impossible: a cadre chosen under one ministry is meaningless
   * once the sector becomes another, and an expiry date typed against a
   * temporary contract is a contradiction once the contract becomes permanent.
   *
   * When this field also draws on a list that belongs to a parent — sector
   * categories — the same reference filters the list and reloads it.
   */
  dependsOn: z.string().nullish(),
  /**
   * What makes this field mandatory when its own `required` is false.
   *
   * Compared against the CODE of the referenced answer, never its name or its
   * id, so an administrator may rename "Kwa Muda" and the rule survives — and
   * so the same configuration behaves identically in a database where the row
   * has a different id.
   */
  requiredWhen: z
    .object({ field: z.string(), equals: z.array(z.string()) })
    .nullish(),
  /**
   * Where the answer is kept.
   *
   * Absent means this customer type's own JSON store, which is the default and
   * what every field configured before this existed does. Naming one of the
   * allowlisted registration fields (see structured-fields.ts) puts the answer
   * in that customer column instead, where it stays searchable and reportable.
   *
   * Declared, never inferred from the key — inferring it would silently
   * relocate the answers of every customer type already using such a key, and
   * would let a field overwrite a real column by accident.
   */
  storesIn: z.string().nullish(),
  placeholder: z.string().nullish(),
  helpText: z.string().nullish(),
  /** Spans both columns of the grid — for a long text answer. */
  fullWidth: z.boolean().nullish(),
});
export type DynamicFormField = z.infer<typeof DynamicFormFieldSchema>;

/**
 * Backend spec §2.3 — drives KYC requirements, risk tier, and (via
 * category_product_eligibility) which loan products a customer may apply
 * for. Deliberately separate from LoanProduct and RepaymentSchedule.
 */
/**
 * One Customer Type — the broad classification the Super Administrator
 * configures. Named `CustomerCategory` in the code because that is the table,
 * the payload property and the deployed API contract; the UI calls it a
 * Customer Type, which is the business term.
 */
export const CustomerCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable().optional(),
  /**
   * The heading the registration form puts over this type's own questions —
   * "MTUMISHI WA UMMA" over WATUMISHI's. Separate from `name` because the name
   * is the administrator's label for the classification and this is what the
   * form calls the section. Null means "use the name".
   */
  formTitle: z.string().nullable().optional(),
  /* Whether registration may still offer it, and where it sits in the list.
     A retired type stays on file — every customer under it keeps their
     classification — it simply stops being offered to new registrations. */
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
  riskTier: z.enum(RISK_TIERS),
  /** Determines whether the registration wizard labels its dynamic step "Employment Details" or "Business Information". */
  sector: z.enum(CUSTOMER_CATEGORY_SECTORS),
  requiredDocuments: z.array(z.string()),
  /** Offered a slot on the documents step, never blocking. */
  optionalDocuments: z.array(z.string()).optional(),
  dynamicFormSchema: z.array(DynamicFormFieldSchema),
  /*
   * Which of the FIRST-CLASS registration blocks this category asks for.
   *
   * Sector, contract and salary are real columns on the customer, so they are
   * not repeated inside `dynamicFormSchema` — that would describe the same
   * fact twice, in two shapes. These three booleans say which blocks to show,
   * and the wizard shows them off these rather than off a list of category
   * codes it would otherwise have to know by heart.
   */
  requiresSector: z.boolean(),
  /* A private-sector employee names a COMPANY, not a ministry — a separate
     list, and never both. */
  requiresEmployer: z.boolean(),
  requiresContract: z.boolean(),
  requiresSalary: z.boolean(),
  requiresExtraApproval: z.boolean(),
  createdBy: z.string().nullable(),
  deletedAt: z.string().nullable(),
  /** Counted by the API on the index/show routes; absent elsewhere. */
  customerCount: z.number().optional(),
});
export type CustomerCategory = z.infer<typeof CustomerCategorySchema>;

export const CustomerBankDetailsSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  checkNumber: z.string().nullable(),
  phoneNumber: z.string().nullable(),
});
export type CustomerBankDetails = z.infer<typeof CustomerBankDetailsSchema>;

export const CustomerDocumentSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  documentType: z.string(),
  /**
   * A signed, time-limited URL to the API's download route — not a storage
   * path. The route sits outside Sanctum precisely so this can be used as a
   * plain href or <img> src, which a bearer token could not be attached to.
   */
  filePath: z.string(),
  /** The name the file was uploaded under, which is what a download should be called. */
  originalName: z.string().nullable(),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().nullable(),
  uploadedBy: z.string().nullable(),
  createdAt: z.string(),
});
export type CustomerDocument = z.infer<typeof CustomerDocumentSchema>;

/** Whether the browser can render this inline, or should only offer to download it. */
export function isPreviewable(document: Pick<CustomerDocument, "mimeType">): boolean {
  const type = document.mimeType ?? "";
  return type.startsWith("image/") || type === "application/pdf";
}

export const CustomerSchema = z.object({
  id: z.string(),
  customerNumber: z.string(),
  nidaNumber: z.string(),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  dob: z.string(),
  gender: z.enum(GENDERS),
  phone: z.string(),
  photoPath: z.string().nullable(),
  nidaVerifiedAt: z.string().nullable(),
  otpVerifiedAt: z.string().nullable(),
  faceVerifiedAt: z.string().nullable(),

  /* The active face scan's summary, so a list can show "verified, 92%"
     without a request per row. The full report lives behind
     /customers/{id}/face-scans — see types/face-scan.ts. */
  faceScanId: z.string().nullable().optional(),
  faceScanStatus: z.enum(["passed", "failed"]).nullable().optional(),
  faceScanQuality: z.number().nullable().optional(),
  faceScanVersion: z.string().nullable().optional(),
  faceScannedAt: z.string().nullable().optional(),
  faceScannedById: z.string().nullable().optional(),
  faceScannedByName: z.string().nullable().optional(),

  /* Why the account stands as it does — recorded on every suspension and
     reactivation, like `rejectionReason` is on a rejection. */
  statusReason: z.string().nullable().optional(),
  statusRemarks: z.string().nullable().optional(),
  statusChangedAt: z.string().nullable().optional(),
  statusChangedById: z.string().nullable().optional(),

  maritalStatus: z.enum(MARITAL_STATUSES).nullable(),
  regionId: z.string().nullable(),
  districtId: z.string().nullable(),
  /*
   * Region → District → Ward → Street, all four CHOSEN from the reference
   * tables, per the documented design. The `*_name` fields stay in the
   * contract because records registered while ward and street were typed
   * still hold them, and dropping the fields would make those records
   * unreadable — but the wizard now sends ids.
   *
   * The reference tables are seeded with a demonstration subset, not the
   * whole country. Where a ward is missing it is imported through
   * Administration, never typed into a customer record.
   */
  wardId: z.string().nullable().optional(),
  streetId: z.string().nullable().optional(),
  wardName: z.string().nullable().optional(),
  streetName: z.string().nullable().optional(),
  residenceType: z.enum(RESIDENCE_TYPES).nullable(),

  /*
   * Identity as ONE type plus ONE number — see the API's 2026_08_30
   * migration. The named columns further down stay in the contract for
   * records captured before this pair existed; the wizard writes this pair.
   */
  idTypeId: z.string().nullable().optional(),
  idNumber: z.string().nullable().optional(),

  /*
   * Where the customer serves, and on what terms. Shown only for a category
   * whose `requiresSector` / `requiresContract` says so — the wizard never
   * decides that from a category code.
   */
  sectorId: z.string().nullable().optional(),
  sectorCategoryId: z.string().nullable().optional(),
  contractTypeId: z.string().nullable().optional(),
  /* Required by the API when the contract type is TEMPORARY, refused when it
     is not. The rule is the server's; the form mirrors it. */
  contractExpiryDate: z.string().nullable().optional(),
  /** The private employer, from its own admin-managed list. */
  employerId: z.string().nullable().optional(),


  /*
   * The KYC detail block — real columns on the API, not `dynamicFormData`.
   * That stays for whatever a customer *category* asks; these are facts every
   * customer has and that the business searches and reports on.
   * All nullable: a microfinance customer often has no email, TIN or passport.
   */
  alternativePhone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  nationalIdNumber: z.string().nullable().optional(),
  tinNumber: z.string().nullable().optional(),
  passportNumber: z.string().nullable().optional(),
  village: z.string().nullable().optional(),
  houseNumber: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  landmark: z.string().nullable().optional(),
  occupation: z.string().nullable().optional(),
  employer: z.string().nullable().optional(),
  monthlyIncome: z.number().nullable().optional(),
  employmentType: z.string().nullable().optional(),
  /* Free text, like employmentType. No list of occupations is complete. */
  workType: z.string().nullable().optional(),
  businessName: z.string().nullable().optional(),
  businessType: z.string().nullable().optional(),
  businessAddress: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankBranch: z.string().nullable().optional(),
  accountName: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  mobileMoneyProvider: z.string().nullable().optional(),
  walletNumber: z.string().nullable().optional(),
  registrationSource: z.string().nullable().optional(),

  // ---- legacy registration form: master-data references + its own fields ----
  employeeId: z.string().nullable().optional(),
  loanTypeId: z.string().nullable().optional(),
  customerTypeId: z.string().nullable().optional(),
  accountTypeId: z.string().nullable().optional(),
  workTypeId: z.string().nullable().optional(),
  employmentTypeId: z.string().nullable().optional(),
  occupationId: z.string().nullable().optional(),
  maritalStatusId: z.string().nullable().optional(),
  bankId: z.string().nullable().optional(),
  mobileMoneyProviderId: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  councilNumber: z.string().nullable().optional(),
  placeOfEmployment: z.string().nullable().optional(),
  retirementDate: z.string().nullable().optional(),
  dependentsCount: z.number().nullable().optional(),
  basicSalary: z.number().nullable().optional(),
  takeHome: z.number().nullable().optional(),
  checkNumber: z.string().nullable().optional(),
  voterIdNumber: z.string().nullable().optional(),
  driverLicenceNumber: z.string().nullable().optional(),
  workIdNumber: z.string().nullable().optional(),
  /* Sent full, stored as last four. See the API's RegisterCustomerAction. */
  cardNumber: z.string().nullable().optional(),
  cardLastFour: z.string().nullable().optional(),
  cardExpiryMonth: z.number().nullable().optional(),
  cardExpiryYear: z.number().nullable().optional(),
  customerCategoryId: z.string().nullable(),
  /** Validated against customerCategory.dynamicFormSchema at write time. */
  dynamicFormData: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).nullable(),
  branchId: z.string(),
  kycStatus: z.enum(KYC_STATUSES),
  status: z.enum(CUSTOMER_STATUSES),
  /** Only meaningful once KYC is complete and the assigned category has requiresExtraApproval. */
  approvalStatus: z.enum(CUSTOMER_APPROVAL_STATUSES),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type Customer = z.infer<typeof CustomerSchema>;

export function customerFullName(c: Pick<Customer, "firstName" | "middleName" | "lastName">): string {
  return [c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ");
}

/**
 * KYC checklist — backend spec §9. All five must be true for kycStatus =
 * 'completed'.
 *
 * The shape only; the evaluation is `GET /customers/{customer}/kyc-status`.
 * It cannot be computed here: `additionalDataComplete` turns on whether a bank
 * record exists, and the API accepts bank details on write without ever
 * returning them.
 */
/**
 * One line of the checklist the API now returns.
 *
 * The flat `KycChecklist` below is the original five-key map and is kept
 * because the contract published it, but it cannot express what the officer
 * needs to know: whether a line is required for THIS customer's account type,
 * and — for NIDA and SMS — whether it is required but impossible here.
 */
export interface KycRequirement {
  key: string;
  label: string;
  satisfied: boolean;
  required: boolean;
  /** Demanded by policy, but the integration does not exist in this deployment. */
  blocked: boolean;
  detail: string | null;
}

/** How far a registration has got. Derived by the API, never stored. */
export type RegistrationStage =
  | "draft"
  | "information_incomplete"
  | "awaiting_face_verification"
  /* KYC finished; a Branch Manager must now approve the registration. */
  | "awaiting_registration_approval"
  | "registration_rejected"
  | "not_eligible"
  | "loan_eligible";

export interface RegistrationProgress {
  stage: RegistrationStage;
  label: string;
  outstanding: string[];
  nextAction: string | null;
  isLoanEligible: boolean;
}

/** Whether this deployment can perform an external check at all. */
export interface ExternalVerificationState {
  available: boolean;
  note: string;
}

export interface KycChecklist {
  nidaVerified: boolean;
  otpVerified: boolean;
  faceVerified: boolean;
  additionalDataComplete: boolean;
  categoryAssigned: boolean;
}

export const NidaLookupInputSchema = z.object({
  nidaNumber: z.string().min(10),
});
export type NidaLookupInput = z.infer<typeof NidaLookupInputSchema>;

export const NidaOtpVerifyInputSchema = z.object({
  nidaNumber: z.string().min(10),
  otp: z.string().length(6),
});
export type NidaOtpVerifyInput = z.infer<typeof NidaOtpVerifyInputSchema>;

export const CreateCustomerInputSchema = CustomerSchema.pick({
  firstName: true,
  middleName: true,
  lastName: true,
  dob: true,
  gender: true,
  phone: true,
  nidaNumber: true,
  branchId: true,
}).extend({ middleName: z.string().nullable().optional() });
export type CreateCustomerInput = z.infer<typeof CreateCustomerInputSchema>;

/** Simulated NIDA registry response — backend spec §9 ("NIDA ndiyo source ya truth"). */
export interface NidaLookupResult {
  firstName: string;
  middleName: string | null;
  lastName: string;
  dob: string;
  gender: "male" | "female";
}

/** The full Registration Wizard payload, assembled client-side across every step. */
export const RegisterCustomerInputSchema = z.object({
  /*
   * Identity assurance is optional, and matches the API rule exactly: a
   * National ID may be absent, but if one is supplied the timestamp that
   * verified it must be too. Both were `required` while `NidaRegistry` stood in
   * for the registry — which meant every registration carried timestamps for
   * checks that never ran. Manual registration is the supported flow until the
   * integration exists; see features/customers/identity/identity-provider.ts.
   */
  /*
   * Empty means "not provided", not "too short".
   *
   * The field is optional, but it is registered by an <input>, so an untouched
   * one arrives as "" rather than null — and `.min(10)` rejected that with
   * "expected string to have >=10 characters", blocking every manual
   * registration on a field the officer had deliberately left blank. Empty is
   * normalised to null here, which is also what the API wants.
   */
  nidaNumber: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || v.length >= 10, {
      message: "A National ID must be at least 10 characters.",
    })
    .optional(),
  nidaVerifiedAt: z.string().nullable().optional(),
  otpVerifiedAt: z.string().nullable().optional(),
  faceVerifiedAt: z.string().nullable().optional(),
  firstName: z.string().min(1),
  middleName: z.string().nullable(),
  lastName: z.string().min(1),
  dob: z.string().min(1),
  gender: z.enum(GENDERS),
  phone: z.string().min(9),
  maritalStatus: z.enum(MARITAL_STATUSES).nullable(),
  regionId: z.string().nullable(),
  districtId: z.string().nullable(),
  /*
   * Region → District → Ward → Street, all four CHOSEN from the reference
   * tables, per the documented design. The `*_name` fields stay in the
   * contract because records registered while ward and street were typed
   * still hold them, and dropping the fields would make those records
   * unreadable — but the wizard now sends ids.
   *
   * The reference tables are seeded with a demonstration subset, not the
   * whole country. Where a ward is missing it is imported through
   * Administration, never typed into a customer record.
   */
  wardId: z.string().nullable().optional(),
  streetId: z.string().nullable().optional(),
  wardName: z.string().nullable().optional(),
  streetName: z.string().nullable().optional(),
  residenceType: z.enum(RESIDENCE_TYPES).nullable(),

  /*
   * Identity as ONE type plus ONE number — see the API's 2026_08_30
   * migration. The named columns further down stay in the contract for
   * records captured before this pair existed; the wizard writes this pair.
   */
  idTypeId: z.string().nullable().optional(),
  idNumber: z.string().nullable().optional(),

  /*
   * Where the customer serves, and on what terms. Shown only for a category
   * whose `requiresSector` / `requiresContract` says so — the wizard never
   * decides that from a category code.
   */
  sectorId: z.string().nullable().optional(),
  sectorCategoryId: z.string().nullable().optional(),
  contractTypeId: z.string().nullable().optional(),
  /* Required by the API when the contract type is TEMPORARY, refused when it
     is not. The rule is the server's; the form mirrors it. */
  contractExpiryDate: z.string().nullable().optional(),
  /** The private employer, from its own admin-managed list. */
  employerId: z.string().nullable().optional(),


  /*
   * The KYC detail block — real columns on the API, not `dynamicFormData`.
   * That stays for whatever a customer *category* asks; these are facts every
   * customer has and that the business searches and reports on.
   * All nullable: a microfinance customer often has no email, TIN or passport.
   */
  alternativePhone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  nationalIdNumber: z.string().nullable().optional(),
  tinNumber: z.string().nullable().optional(),
  passportNumber: z.string().nullable().optional(),
  village: z.string().nullable().optional(),
  houseNumber: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  landmark: z.string().nullable().optional(),
  occupation: z.string().nullable().optional(),
  employer: z.string().nullable().optional(),
  monthlyIncome: z.number().nullable().optional(),
  employmentType: z.string().nullable().optional(),
  /* Free text, like employmentType. No list of occupations is complete. */
  workType: z.string().nullable().optional(),
  businessName: z.string().nullable().optional(),
  businessType: z.string().nullable().optional(),
  businessAddress: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankBranch: z.string().nullable().optional(),
  accountName: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  mobileMoneyProvider: z.string().nullable().optional(),
  walletNumber: z.string().nullable().optional(),
  registrationSource: z.string().nullable().optional(),

  // ---- legacy registration form: master-data references + its own fields ----
  employeeId: z.string().nullable().optional(),
  loanTypeId: z.string().nullable().optional(),
  customerTypeId: z.string().nullable().optional(),
  accountTypeId: z.string().nullable().optional(),
  workTypeId: z.string().nullable().optional(),
  employmentTypeId: z.string().nullable().optional(),
  occupationId: z.string().nullable().optional(),
  maritalStatusId: z.string().nullable().optional(),
  bankId: z.string().nullable().optional(),
  mobileMoneyProviderId: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  councilNumber: z.string().nullable().optional(),
  placeOfEmployment: z.string().nullable().optional(),
  retirementDate: z.string().nullable().optional(),
  dependentsCount: z.number().nullable().optional(),
  basicSalary: z.number().nullable().optional(),
  takeHome: z.number().nullable().optional(),
  checkNumber: z.string().nullable().optional(),
  voterIdNumber: z.string().nullable().optional(),
  driverLicenceNumber: z.string().nullable().optional(),
  workIdNumber: z.string().nullable().optional(),
  /* Sent full, stored as last four. See the API's RegisterCustomerAction. */
  cardNumber: z.string().nullable().optional(),
  cardLastFour: z.string().nullable().optional(),
  cardExpiryMonth: z.number().nullable().optional(),
  cardExpiryYear: z.number().nullable().optional(),
  branchId: z.string(),
  /* Optional: the legacy registration form has no category field — it's
     assigned later from the profile. See RegisterCustomerRequest. */
  customerCategoryId: z.string().optional(),
  dynamicFormData: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  bankDetails: z
    .object({ bankName: z.string(), accountNumber: z.string(), accountName: z.string(), phoneNumber: z.string().nullable() })
    .nullable(),
  guarantors: z.array(
    z.object({ name: z.string(), phone: z.string(), nidaNumber: z.string().nullable(), relationship: z.string(), address: z.string().nullable(), occupation: z.string().nullable() })
  ),
  nextOfKin: z.array(z.object({ name: z.string(), relationship: z.string(), phone: z.string(), address: z.string().nullable() })),
});
export type RegisterCustomerInput = z.infer<typeof RegisterCustomerInputSchema>;

export function needsApproval(category: Pick<CustomerCategory, "requiresExtraApproval">): boolean {
  return category.requiresExtraApproval;
}
