"use client";

import { GENDERS, RESIDENCE_TYPES } from "@/types/enums";
import { EditableSection } from "@/features/customers/profile/editable-section";
import type { MasterDataList, MasterDataOption } from "@/lib/api/master-data";
import type { Customer } from "@/types/customer";

/**
 * The editable blocks of the customer profile.
 *
 * One section per group the registration wizard captures, in the same order,
 * so an officer correcting a record finds the field where they entered it.
 * Every list is the same admin-managed master data the wizard reads — nothing
 * here knows a dropdown value in advance.
 *
 * `Identity Documents` is deliberately its own section rather than part of
 * Personal: those five numbers are the KYC evidence, they carry uniqueness
 * constraints, and an officer editing them is doing something different from
 * fixing a spelling.
 */

type Lookups = Record<MasterDataList, MasterDataOption[]>;

/** Master-data rows in the shape the combobox wants. */
const opts = (rows: MasterDataOption[] | undefined) =>
  (rows ?? []).map((r) => ({ value: r.id, label: r.name }));

/** A plain string enum in the same shape. */
const enumOpts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

export function ProfileSections({
  customer,
  lookups,
  branches,
  employees,
  canEdit,
}: {
  customer: Customer;
  lookups: Lookups;
  branches: { id: string; name: string }[];
  employees: { id: string; name: string }[];
  canEdit: boolean;
}) {
  /* Read once into a plain bag — every section reads its own keys out of it. */
  const v = customer as unknown as Record<string, string | number | null>;

  return (
    <div className="space-y-4">
      <EditableSection
        title="Basic Information"
        customerId={customer.id}
        canEdit={canEdit}
        values={v}
        fields={[
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
        ]}
      />

      <EditableSection
        title="Additional Detail"
        customerId={customer.id}
        canEdit={canEdit}
        values={v}
        fields={[
          { name: "maritalStatusId", label: "Martial Status", kind: "select", options: opts(lookups["marital-statuses"]) },
          { name: "accountTypeId", label: "Account Type", kind: "select", options: opts(lookups["account-types"]) },
          /* Typed, not chosen — see the API's 2026_08_26 migration. The list
             version is gone from the form; records that reference a list entry
             still read correctly because the migration copied the name across. */
          { name: "workType", label: "Work Type" },
          /* Reads the `loan-types` lookup, which holds the names of the
             institution's loan categories — not a customer classification.
             The property keeps its name for API compatibility. */
          { name: "loanTypeId", label: "Loan Category Name", kind: "select", options: opts(lookups["loan-types"]) },
          /* The legacy `customer_types` master-data list, which is NOT the
             Customer Type classification — that is `customerCategoryId`. Kept
             for records captured before the two were told apart, and named
             here so nobody reads it as the classification. */
          { name: "customerTypeId", label: "Legacy customer list", kind: "select", options: opts(lookups["customer-types"]) },
          { name: "dependentsCount", label: "Number of Dependents", kind: "number" },
        ]}
      />

      <EditableSection
        title="Employment"
        customerId={customer.id}
        canEdit={canEdit}
        values={v}
        fields={[
          { name: "employmentType", label: "Type of employment" },
          { name: "occupationId", label: "Occupation", kind: "select", options: opts(lookups.occupations) },
          { name: "employer", label: "Name of employer" },
          { name: "department", label: "Department" },
          { name: "councilNumber", label: "Council No" },
          { name: "placeOfEmployment", label: "Place Employment" },
          { name: "retirementDate", label: "Date of retirement", kind: "date" },
          { name: "basicSalary", label: "Basic Salary", kind: "number" },
          { name: "takeHome", label: "Take home", kind: "number" },
          { name: "monthlyIncome", label: "Monthly Income", kind: "number" },
        ]}
      />

      <EditableSection
        title="Business"
        customerId={customer.id}
        canEdit={canEdit}
        values={v}
        fields={[
          { name: "businessName", label: "Business Name" },
          { name: "businessType", label: "Business Type" },
          { name: "businessAddress", label: "Business Address" },
        ]}
      />

      <EditableSection
        title="Address"
        customerId={customer.id}
        canEdit={canEdit}
        values={v}
        fields={[
          /* Region and district remain chosen from reference data; ward and
             street are typed, because those tables do not cover the country. */
          { name: "wardName", label: "Ward" },
          { name: "streetName", label: "Street" },
          { name: "village", label: "Village" },
          { name: "houseNumber", label: "House Number" },
          { name: "postalCode", label: "Postal Code" },
          { name: "landmark", label: "Landmark" },
          {
            name: "residenceType",
            label: "Residence Type",
            kind: "select",
            options: enumOpts(RESIDENCE_TYPES),
          },
        ]}
      />

      <EditableSection
        title="Identity Documents"
        customerId={customer.id}
        canEdit={canEdit}
        values={v}
        fields={[
          { name: "nationalIdNumber", label: "National ID (NIDA)" },
          { name: "voterIdNumber", label: "Voter ID" },
          { name: "driverLicenceNumber", label: "Driver's Licence" },
          { name: "passportNumber", label: "Passport Number" },
          { name: "tinNumber", label: "TIN Number" },
          { name: "workIdNumber", label: "Work ID number" },
        ]}
      />

      <EditableSection
        title="Bank & Mobile Money"
        customerId={customer.id}
        canEdit={canEdit}
        values={v}
        fields={[
          { name: "bankId", label: "Bank", kind: "select", options: opts(lookups.banks) },
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
          { name: "walletNumber", label: "Wallet Number" },
          {
            name: "cardLastFour",
            label: "Card",
            /* Read-only by omission from the update map: the last four are
               derived from a number this form never holds. Re-entering a card
               means re-entering it in full, which registration does. */
            display: (value) => (value ? `•••• ${value}` : <span className="text-muted-foreground">—</span>),
          },
          { name: "cardExpiryMonth", label: "Expiry month", kind: "number" },
          { name: "cardExpiryYear", label: "Expiry year", kind: "number" },
        ]}
      />
    </div>
  );
}
