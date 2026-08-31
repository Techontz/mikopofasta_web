import type { Customer, CustomerBankDetails, CustomerCategory } from "@/types/customer";
import type { Branch, District, Region, Street, Ward } from "@/types/branch";
import type { MasterDataOption } from "@/types/master-data";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  );
}

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
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Personal Details</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Identity Document">{identityDocument ?? "—"}</Field>
          <Field label="Date of Birth">{customer.dob}</Field>
          <Field label="Gender">
            <span className="capitalize">{customer.gender}</span>
          </Field>
          <Field label="Marital Status">
            <span className="capitalize">{maritalStatus ?? "—"}</span>
          </Field>
          <Field label="Branch">{branch?.name ?? "—"}</Field>
          <Field label="Category">{category?.name ?? "Uncategorized"}</Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Contact & Address</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Phone">{customer.phone}</Field>
          <Field label="Residence Type">
            <span className="capitalize">{customer.residenceType ?? "—"}</span>
          </Field>
          <Field label="Region">{region?.name ?? "—"}</Field>
          <Field label="District">{district?.name ?? "—"}</Field>
          {/*
            The typed name first, the reference row as a fallback.
            Registrations before the 2026_08_26 migration hold only an id, and
            that migration copied the names down — so this reads the column for
            everybody and falls back only if a record somehow has one without
            the other.
          */}
          <Field label="Ward">{customer.wardName ?? ward?.name ?? "—"}</Field>
          <Field label="Street">{customer.streetName ?? street?.name ?? "—"}</Field>
        </div>
      </section>

      {bankDetails && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Bank Details</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Bank">{bankDetails.bankName}</Field>
            <Field label="Account Number">{bankDetails.accountNumber}</Field>
            <Field label="Account Name">{bankDetails.accountName}</Field>
          </div>
        </section>
      )}

      {category && customer.dynamicFormData && Object.keys(customer.dynamicFormData).length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{category.sector === "employment" ? "Employment Details" : category.sector === "business" ? "Business Information" : "Additional Information"}</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {category.dynamicFormSchema.map((field) => (
              <Field key={field.key} label={field.label}>
                {String(customer.dynamicFormData?.[field.key] ?? "—")}
              </Field>
            ))}
          </div>
        </section>
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
