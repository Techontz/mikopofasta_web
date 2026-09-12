import { GENDERS, RESIDENCE_TYPES } from "@/types/enums";
import { anyPresent, isPresent } from "@/features/customers/profile/field-presence";
import type { EditableField } from "@/features/customers/profile/editable-section";
import type { MasterDataList, MasterDataOption } from "@/types/master-data";
import type { CustomerCategory } from "@/types/customer";

/**
 * Which blocks a customer's profile is made of, and which questions each one
 * asks THIS customer.
 *
 * Separated from the rendering because it is the part with rules in it, and
 * rules that decide whether an officer is ever shown a field are worth being
 * able to test without a browser. See `__tests__/profile-section-specs.test.ts`.
 *
 * Two decisions live here, and only the second one:
 *
 *   1. IS THERE AN ANSWER? Not decided here at all — `isPresent` answers it
 *      against the record, in the component and in `EditableSection`. A field
 *      or a section with an answer is always shown, whatever this file says.
 *
 *   2. IS IT WORTH ASKING? That is this file. A salaried customer is not asked
 *      for a business name; a trader is not asked for a council number; a type
 *      whose `requiresSalary` is false is not asked for a take-home. Getting
 *      this wrong can only ever mean an empty block is offered or withheld —
 *      never that a recorded value disappears.
 */

export type Lookups = Record<MasterDataList, MasterDataOption[]>;

export interface SectionSpec {
  key: string;
  title: string;
  fields: EditableField[];
  /**
   * Whether this block is part of this customer's profile at all. A section
   * holding answers is shown whatever this says; this decides only whether an
   * empty one is offered under `Add information`.
   */
  relevant: boolean;
}

/** Master-data rows in the shape the combobox wants. */
const opts = (rows: MasterDataOption[] | undefined) =>
  (rows ?? []).map((r) => ({ value: r.id, label: r.name }));

/** A plain string enum in the same shape. */
const enumOpts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

/**
 * A column kept for records that still hold one, whose replacement is the
 * field beside it. Shown when it has a value — dropping it would make old
 * records unreadable — and never offered on a record that does not, which
 * would be inviting an officer to write to the superseded column.
 */
const superseded = { relevant: false } as const;

/** Does this section hold anything at all for this customer? */
export function sectionHasAnswers(
  section: SectionSpec,
  values: Record<string, unknown>
): boolean {
  return anyPresent(values, section.fields.map((f) => f.name));
}

export function buildProfileSections({
  values,
  category,
  lookups,
  branches,
  employees,
}: {
  /** The customer resource as a flat bag, which is how every section reads it. */
  values: Record<string, string | number | null>;
  /**
   * The customer's TYPE — `CustomerCategory` in the code, the classification
   * the Super Administrator configures. Its `sector` says whether this person
   * is employed, trades, or neither, and `requiresSector` / `requiresEmployer`
   * / `requiresContract` / `requiresSalary` say which employment blocks that
   * type actually asks for. Read here rather than inferred from a category
   * code, exactly as the registration wizard reads it.
   *
   * Undefined for a record registered before types existed, or whose type has
   * been removed: nothing is then known about what is relevant, so nothing is
   * narrowed and every block stays on offer.
   */
  category: CustomerCategory | undefined;
  lookups: Lookups;
  branches: { id: string; name: string }[];
  employees: { id: string; name: string }[];
}): SectionSpec[] {
  /*
   * WHAT THIS TYPE OF CUSTOMER IS ASKED FOR.
   *
   * `sector` is the wizard's own switch between "Employment Details" and
   * "Business Information", so the profile follows it rather than inventing a
   * second rule. An unclassified customer narrows nothing: better to offer a
   * block that turns out not to apply than to hide the one place an officer
   * could record what they are holding.
   */
  const employed = category ? category.sector === "employment" : true;
  const trading = category ? category.sector === "business" : true;

  /* Sector, employer, contract and salary are first-class columns rather than
     dynamic-form answers, and the type says which of them it asks for. Absent
     a type, all four stay on offer. */
  const asksSector = category ? category.requiresSector : true;
  const asksEmployer = category ? category.requiresEmployer : true;
  const asksContract = category ? category.requiresContract : true;
  const asksSalary = category ? category.requiresSalary : true;

  /* An expiry with no card on file is an orphan. */
  const hasCard = isPresent(values.cardLastFour);

  return [
    {
      key: "basic",
      title: "Basic Information",
      relevant: true,
      fields: [
        { name: "firstName", label: "First Name" },
        { name: "middleName", label: "Middle name" },
        { name: "lastName", label: "Last name" },
        { name: "nickname", label: "Nick name" },
        { name: "gender", label: "Gender", kind: "select", options: enumOpts(GENDERS) },
        { name: "dob", label: "Date of Birth", kind: "date" },
        { name: "phone", label: "Phone Number" },
        { name: "alternativePhone", label: "Alternative Phone" },
        { name: "email", label: "Email" },
        { name: "nationality", label: "Nationality" },
        { name: "branchId", label: "Branch", kind: "select", options: branches.map((b) => ({ value: b.id, label: b.name })) },
        { name: "employeeId", label: "Employee", kind: "select", options: employees.map((e) => ({ value: e.id, label: e.name })) },
      ],
    },

    {
      key: "additional",
      title: "Additional Detail",
      relevant: true,
      fields: [
        { name: "maritalStatusId", label: "Martial Status", kind: "select", options: opts(lookups["marital-statuses"]) },
        { name: "accountTypeId", label: "Account Type", kind: "select", options: opts(lookups["account-types"]) },
        /* Typed, not chosen — see the API's 2026_08_26 migration. The list
           version is gone from the form; records that reference a list entry
           still read correctly because the migration copied the name across. */
        { name: "workType", label: "Work Type" },
        { name: "workTypeId", label: "Work Type (list)", kind: "select", options: opts(lookups["work-types"]), ...superseded },
        /* Reads the `loan-types` lookup, which holds the names of the
           institution's loan categories — not a customer classification.
           The property keeps its name for API compatibility. */
        { name: "loanTypeId", label: "Loan Category Name", kind: "select", options: opts(lookups["loan-types"]) },
        /* The legacy `customer_types` master-data list, which is NOT the
           Customer Type classification — that is `customerCategoryId`. Kept
           for records captured before the two were told apart, and named
           here so nobody reads it as the classification. */
        { name: "customerTypeId", label: "Legacy customer list", kind: "select", options: opts(lookups["customer-types"]), ...superseded },
        { name: "dependentsCount", label: "Number of Dependents", kind: "number" },
      ],
    },

    {
      key: "employment",
      title: "Employment",
      relevant: employed,
      fields: [
        { name: "employmentType", label: "Type of employment", relevant: employed },
        { name: "employmentTypeId", label: "Type of employment (list)", kind: "select", options: opts(lookups["employment-types"]), ...superseded },
        { name: "occupationId", label: "Occupation", kind: "select", options: opts(lookups.occupations), relevant: employed },
        /* Free text from an older form; the list above replaced it. */
        { name: "occupation", label: "Occupation (typed)", ...superseded },
        /* Where they serve and on what terms — first-class columns, shown only
           for a type that asks for them. See the API's 2026_08_30 migration. */
        { name: "sectorId", label: "Sector", kind: "select", options: opts(lookups.sectors), relevant: employed && asksSector },
        { name: "employerId", label: "Employer", kind: "select", options: opts(lookups.employers), relevant: employed && asksEmployer },
        { name: "employer", label: "Name of employer", relevant: employed },
        { name: "contractTypeId", label: "Contract Type", kind: "select", options: opts(lookups["contract-types"]), relevant: employed && asksContract },
        /* Required by the API only for a TEMPORARY contract; offered wherever
           a contract is, refused by the server where it does not belong. */
        { name: "contractExpiryDate", label: "Contract Expiry", kind: "date", relevant: employed && asksContract },
        { name: "department", label: "Department", relevant: employed },
        { name: "councilNumber", label: "Council No", relevant: employed },
        { name: "placeOfEmployment", label: "Place Employment", relevant: employed },
        { name: "retirementDate", label: "Date of retirement", kind: "date", relevant: employed },
        { name: "basicSalary", label: "Basic Salary", kind: "number", relevant: employed && asksSalary },
        { name: "takeHome", label: "Take home", kind: "number", relevant: employed && asksSalary },
        { name: "monthlyIncome", label: "Monthly Income", kind: "number", relevant: employed && asksSalary },
      ],
    },

    {
      key: "business",
      title: "Business",
      relevant: trading,
      fields: [
        { name: "businessName", label: "Business Name", relevant: trading },
        { name: "businessType", label: "Business Type", relevant: trading },
        { name: "businessAddress", label: "Business Address", relevant: trading },
      ],
    },

    {
      key: "address",
      title: "Address",
      relevant: true,
      fields: [
        /* Region and district remain chosen from reference data; ward and
           street are typed, because those tables do not cover the country. */
        { name: "wardName", label: "Ward" },
        { name: "streetName", label: "Street" },
        { name: "village", label: "Village" },
        { name: "houseNumber", label: "House Number" },
        { name: "postalCode", label: "Postal Code" },
        { name: "landmark", label: "Landmark" },
        { name: "residenceType", label: "Residence Type", kind: "select", options: enumOpts(RESIDENCE_TYPES) },
      ],
    },

    {
      key: "identity",
      title: "Identity Documents",
      relevant: true,
      fields: [
        /* Identity as ONE type plus ONE number, which is what registration
           writes today. The named columns below stay for records captured
           before the pair existed, and for the officer who is handed a second
           document later — a customer who finally produces their TIN must have
           somewhere to put it. */
        { name: "idTypeId", label: "ID Type", kind: "select", options: opts(lookups["id-types"]) },
        { name: "idNumber", label: "ID Number" },
        { name: "nationalIdNumber", label: "National ID (NIDA)" },
        { name: "voterIdNumber", label: "Voter ID" },
        { name: "driverLicenceNumber", label: "Driver's Licence" },
        { name: "passportNumber", label: "Passport Number" },
        { name: "tinNumber", label: "TIN Number" },
        { name: "workIdNumber", label: "Work ID number" },
      ],
    },

    {
      key: "money",
      title: "Bank & Mobile Money",
      relevant: true,
      fields: [
        /* WHICH of the two this customer uses, as the officer chose it at
           registration. First in the section because it is what the rest of
           the rows are an answer to: the bank rows are filled for a bank
           customer and the wallet rows for an MNO one, and reading the section
           without it means inferring the choice from which boxes happen to
           have something in them — the guess this column replaced. */
        {
          name: "paymentMethod",
          label: "Pays by",
          kind: "select",
          options: [
            { value: "mno", label: "Mobile Money" },
            { value: "bank", label: "Bank Account" },
          ],
        },
        { name: "bankId", label: "Bank", kind: "select", options: opts(lookups.banks) },
        /* The typed bank name an older form wrote, before banks became a list. */
        { name: "bankName", label: "Bank (typed)", ...superseded },
        { name: "bankBranch", label: "Bank Branch" },
        { name: "accountName", label: "Account name" },
        { name: "accountNumber", label: "Account Number" },
        { name: "checkNumber", label: "Check Number" },
        {
          name: "mobileMoneyProviderId",
          label: "Mobile Money Provider",
          kind: "select",
          options: opts(lookups["mobile-money-providers"]),
        },
        { name: "mobileMoneyProvider", label: "Mobile Money Provider (typed)", ...superseded },
        { name: "walletNumber", label: "Wallet Number" },
        {
          name: "cardLastFour",
          label: "Card",
          /* Read-only: the last four are derived from a number this form never
             holds. Re-entering a card means re-entering it in full, which
             registration does. */
          readOnly: true,
          display: (value) => (isPresent(value) ? `•••• ${value}` : null),
        },
        { name: "cardExpiryMonth", label: "Expiry month", kind: "number", relevant: hasCard },
        { name: "cardExpiryYear", label: "Expiry year", kind: "number", relevant: hasCard },
      ],
    },
  ];
}
