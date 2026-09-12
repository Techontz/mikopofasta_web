import { isPresent } from "@/features/customers/profile/field-presence";
import type { Customer, CustomerBankDetails, CustomerCategory } from "@/types/customer";
import type { Branch, District, Region, Street, Ward } from "@/types/branch";
import type { MasterDataOption } from "@/types/master-data";

/**
 * One fact on the summary.
 *
 * `value` is the raw answer and decides whether the fact exists at all;
 * `render` is only how a present one is worded. Keeping those apart matters —
 * a capitalised enum or a formatted date is still a string, so presence
 * checked after formatting would find something in every empty row.
 */
interface Fact {
  label: string;
  value: unknown;
  render?: (value: NonNullable<unknown>) => React.ReactNode;
}

/**
 * A block of facts, which does not exist when none of them do.
 *
 * The summary used to print every fact it knew of and an em dash for each one
 * the record did not hold, so a customer with a phone number and a district
 * showed two answers among eleven dashes. A dash is not information; it is the
 * absence of information taking up the space where information goes.
 */
function Facts({ title, facts }: { title: string; facts: Fact[] }) {
  const shown = facts.filter((f) => isPresent(f.value));
  if (shown.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {/* Two answers get two columns, not three with a hole in the third. */}
      <div className={shown.length === 1 ? "grid gap-4" : shown.length === 2 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
        {shown.map((fact) => (
          <div key={fact.label} className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{fact.label}</p>
            <p className="text-sm font-medium">
              {fact.render ? fact.render(fact.value as NonNullable<unknown>) : String(fact.value)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

const capitalised = (value: NonNullable<unknown>) => <span className="capitalize">{String(value)}</span>;

export function OverviewPanel({
  customer,
  branch,
  category,
  region,
  district,
  ward,
  street,
  bankDetails,
  maritalStatuses,
  idTypes,
}: {
  customer: Customer;
  branch: Branch | undefined;
  category: CustomerCategory | undefined;
  region: Region | undefined;
  district: District | undefined;
  ward: Ward | undefined;
  street: Street | undefined;
  bankDetails: CustomerBankDetails | undefined;
  /**
   * The admin-managed list, so a status this record's enum column cannot hold
   * can still be read out. See `maritalStatus` below.
   */
  maritalStatuses: MasterDataOption[];
  /** Named so the identity document reads as a document, not as a row id. */
  idTypes: MasterDataOption[];
}) {
  /*
   * WHAT THE CUSTOMER ACTUALLY ANSWERED.
   *
   * Marital status is one fact in two columns: the enum the profile has always
   * read, and the foreign key to the admin-managed list the registration form
   * writes. The write paths now keep them in step — see MaritalStatusMirror —
   * but the enum has four fixed values and the list may grow, so an
   * institution that adds "Separated" gets a null enum and a real answer.
   * Naming the chosen list entry covers that, and covers every customer
   * registered before the two columns were connected.
   */
  const maritalStatus =
    customer.maritalStatus ??
    maritalStatuses.find((m) => m.id === customer.maritalStatusId)?.name ??
    null;

  /*
   * WHICH DOCUMENT WAS SEEN, AND WHAT IT SAID.
   *
   * This panel showed one field, "NIDA Number", reading a column registration
   * stopped filling when identity became a TYPE plus a NUMBER — so a customer
   * registered today showed a blank where their identity should be, while the
   * document they actually produced was on the record and displayed nowhere.
   *
   * The pair first, named by the ID type's own label. The NIDA column is the
   * fallback, because records captured before the pair existed hold it and
   * must stay readable.
   */
  const idTypeName = idTypes.find((t) => t.id === customer.idTypeId)?.name;

  const identityDocument =
    idTypeName && customer.idNumber
      ? `${idTypeName} · ${customer.idNumber}`
      : (customer.nidaNumber ?? null);

  /*
   * The type's own questions, and only the ones that were answered.
   *
   * A category may configure a dozen fields of which a customer answers three;
   * the other nine were rendered as dashes under a heading that then described
   * mostly nothing.
   */
  const dynamicFacts: Fact[] = (category?.dynamicFormSchema ?? []).map((field) => ({
    label: field.label,
    value: customer.dynamicFormData?.[field.key] ?? null,
    /* A yes/no answer is a real answer and must not read as the string
       "false" — or, worse, be mistaken for an empty one. */
    render: (value) => (typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)),
  }));

  return (
    <div className="space-y-6">
      <Facts
        title="Personal Details"
        facts={[
          { label: "Identity Document", value: identityDocument },
          { label: "Date of Birth", value: customer.dob },
          { label: "Gender", value: customer.gender, render: capitalised },
          { label: "Marital Status", value: maritalStatus, render: capitalised },
          { label: "Branch", value: branch?.name ?? null },
          /* The classification itself, when the record carries one. An
             unclassified customer is a fact about the record rather than a
             blank, and the header already says so. */
          { label: "Category", value: category?.name ?? null },
        ]}
      />

      <Facts
        title="Contact & Address"
        facts={[
          { label: "Phone", value: customer.phone },
          { label: "Residence Type", value: customer.residenceType, render: capitalised },
          { label: "Region", value: region?.name ?? null },
          { label: "District", value: district?.name ?? null },
          /*
            The typed name first, the reference row as a fallback.
            Registrations before the 2026_08_26 migration hold only an id, and
            that migration copied the names down — so this reads the column for
            everybody and falls back only if a record somehow has one without
            the other.
          */
          { label: "Ward", value: customer.wardName ?? ward?.name ?? null },
          { label: "Street", value: customer.streetName ?? street?.name ?? null },
        ]}
      />

      {bankDetails && (
        <Facts
          title="Bank Details"
          facts={[
            { label: "Bank", value: bankDetails.bankName },
            { label: "Account Number", value: bankDetails.accountNumber },
            { label: "Account Name", value: bankDetails.accountName },
          ]}
        />
      )}

      {category && (
        <Facts
          title={
            category.sector === "employment"
              ? "Employment Details"
              : category.sector === "business"
                ? "Business Information"
                : "Additional Information"
          }
          facts={dynamicFacts}
        />
      )}

      {customer.status === "suspended" && (
        <section className="space-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground">Suspended</h3>
          <p className="text-sm text-muted-foreground">This customer&apos;s account is currently suspended.</p>
        </section>
      )}

      {customer.approvalStatus === "rejected" && customer.rejectionReason && (
        <section className="space-y-1 rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <h3 className="text-sm font-semibold text-destructive">Rejection Reason</h3>
          <p className="text-sm text-destructive">{customer.rejectionReason}</p>
        </section>
      )}
    </div>
  );
}
