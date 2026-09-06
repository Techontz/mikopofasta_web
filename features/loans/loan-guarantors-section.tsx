"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Paperclip, Trash2, Upload, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { GENDERS, GUARANTOR_RELATIONSHIPS, MARITAL_STATUSES } from "@/types/enums";
import { addGuarantor, removeGuarantor } from "@/features/customers/actions";
import {
  importGuarantor,
  listCustomerGuarantors,
  searchImportableGuarantors,
} from "@/features/loans/applicant-actions";
import { loadDistricts, loadRegions } from "@/features/customers/geography-actions";
import type { Guarantor, ImportableGuarantor } from "@/types/guarantor";

/**
 * The loan application's guarantor step, in the two halves the existing screen
 * has: (1)(a) create one, (1)(b) import one already on file, then the table of
 * who is standing for this customer.
 *
 * WHY IT IS ON THIS SCREEN AT ALL. `LoanEligibilityChecker` refuses an
 * application from a customer with no guarantor (`GUARANTORS_REQUIRED`), and
 * the account type's own profile can demand more than one. Until now the
 * officer met that refusal at submit with nowhere to act on it — guarantors
 * could only be added from the customer profile, a screen away. The gate has
 * not moved; what has changed is that the officer can satisfy it here.
 *
 * WHAT THE BACKEND ACTUALLY STORES, AND WHAT IT DOES NOT. A `guarantors` row is
 * name, phone, National ID, relationship, address and occupation — nothing
 * else. The legacy screen also asks for gender, marital status and a passport
 * upload, and those have NO COLUMN on this table. Rather than render three
 * inputs whose contents would be dropped on save — a form that lies about
 * having stored something — they are left off, and the gap is reported rather
 * than papered over. Adding them is a schema change, and not one to make
 * unasked.
 *
 * The name is captured in three parts, as the legacy form does, and joined into
 * the single `name` column. The address is assembled the same way from region,
 * district, ward and street: region and district come from the geography tables
 * the customer wizard already reads; ward and street are typed, because those
 * reference tables do not cover the country and a cascade that dead-ends forces
 * a wrong answer.
 */
export function LoanGuarantorsSection({
  customerId,
  customerName,
  /**
   * The backend's own words when it is refusing for want of a guarantor —
   * the GUARANTORS_REQUIRED violation from the live eligibility check.
   *
   * A number is deliberately NOT passed. The loan's minimum lives in
   * `LoanEligibilityChecker::MINIMUM_GUARANTORS` and is not published by any
   * endpoint, so stating one here would be a second copy of a rule the
   * frontend cannot see — and it would be wrong the day the business makes it
   * configurable. Null means the API is not complaining.
   */
  requirementMessage,
  onCountChange,
}: {
  customerId: string;
  customerName: string;
  requirementMessage?: string | null;
  onCountChange?: (count: number) => void;
}) {
  const [guarantors, setGuarantors] = React.useState<Guarantor[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [pending, startTransition] = useTransition();

  const refresh = React.useCallback(async () => {
    if (!customerId) {
      setGuarantors([]);
      onCountChange?.(0);
      return;
    }

    /* The request is awaited before any state moves, so nothing is set
       synchronously when this is called straight from an effect. */
    setLoading(true);
    const result = await listCustomerGuarantors(customerId);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.message ?? "Could not load this customer's guarantors.");
      return;
    }

    setGuarantors(result.guarantors);
    onCountChange?.(result.guarantors.length);
    // `onCountChange` is a parent callback and intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  React.useEffect(() => {
    /* Deferred by a tick so the first `setLoading` lands outside the effect
       body — see the combobox for the same rule. */
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  if (!customerId) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Guarantors</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Users}
            title="Select a customer first"
            description="Guarantors are recorded against the borrower, so the customer has to be chosen before one can be added."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <CreateGuarantorCard customerId={customerId} onCreated={refresh} busy={pending} />
      <ImportGuarantorCard customerId={customerId} onImported={refresh} busy={pending} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Guarantors for {customerName || "this customer"} ({guarantors.length})
          </CardTitle>
          {requirementMessage ? (
            /* Verbatim from the eligibility check, so the officer reads the
               same sentence the submit would have refused them with. */
            <p className="text-xs text-destructive">{requirementMessage}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Anyone standing for this customer&apos;s repayment.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading guarantors…
            </p>
          ) : guarantors.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No guarantors yet"
              description="Create one above, or import somebody already on file."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Passport</TableHead>
                  <TableHead>Full name</TableHead>
                  <TableHead>Phone number</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Marital status</TableHead>
                  <TableHead>Identification No</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guarantors.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      {/*
                        The signed URL the API produced — opened, never
                        inlined as an <img>: a passport may be a PDF, and the
                        link expires in minutes, so a thumbnail would be a
                        broken image on a page left open.
                      */}
                      {g.passportUrl ? (
                        <a
                          href={g.passportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
                        >
                          <FileText className="size-3.5" aria-hidden />
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>{g.phone}</TableCell>
                    <TableCell className="capitalize">{g.gender ?? "—"}</TableCell>
                    <TableCell className="capitalize">{g.maritalStatus ?? "—"}</TableCell>
                    <TableCell>{g.nidaNumber ?? "—"}</TableCell>
                    <TableCell className="capitalize">{g.relationship}</TableCell>
                    <TableCell className="max-w-xs truncate">{g.address ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={pending}
                        aria-label={`Remove guarantor ${g.name}`}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await removeGuarantor(g.id, customerId);
                            if (result.ok) {
                              toast.success(result.message);
                              await refresh();
                            } else {
                              toast.error(result.message);
                            }
                          })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------- (1)(a) create a guarantor */

function CreateGuarantorCard({
  customerId,
  onCreated,
  busy,
}: {
  customerId: string;
  onCreated: () => Promise<void>;
  busy: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = React.useState("");
  const [middleName, setMiddleName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [nida, setNida] = React.useState("");
  const [relationship, setRelationship] = React.useState<string | null>(null);
  const [occupation, setOccupation] = React.useState("");
  const [gender, setGender] = React.useState<string | null>(null);
  const [maritalStatus, setMaritalStatus] = React.useState<string | null>(null);
  const [passport, setPassport] = React.useState<File | null>(null);
  const [regionId, setRegionId] = React.useState<string | null>(null);
  const [districtId, setDistrictId] = React.useState<string | null>(null);
  const [ward, setWard] = React.useState("");
  const [street, setStreet] = React.useState("");

  /*
   * The loaded options are kept so the chosen id can be resolved to its NAME.
   * `guarantors.address` is one text column, so the address is written in
   * words — and `Combobox.onChange` hands back the value only, which is the
   * id. Holding what the loader returned is how the label is recovered without
   * a second request or a hardcoded list of regions.
   */
  const [regionOptions, setRegionOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [districtOptions, setDistrictOptions] = React.useState<{ value: string; label: string }[]>([]);

  const regionLoader = React.useCallback(async () => {
    const rows = await loadRegions();
    setRegionOptions(rows);
    return rows;
  }, []);

  const districtLoader = React.useCallback(async () => {
    const rows = await loadDistricts(regionId ?? "");
    setDistrictOptions(rows);
    return rows;
  }, [regionId]);

  const regionLabel = regionOptions.find((r) => r.value === regionId)?.label ?? "";
  const districtLabel = districtOptions.find((d) => d.value === districtId)?.label ?? "";

  const name = [firstName, middleName, lastName].map((p) => p.trim()).filter(Boolean).join(" ");
  const canSubmit = name !== "" && phone.trim().length >= 9 && relationship !== null;

  /* One string, from the four levels the legacy form collects. `guarantors`
     stores a single `address` column; splitting it into four would be a schema
     change nobody asked for. */
  const address =
    [street.trim(), ward.trim(), districtLabel, regionLabel].filter(Boolean).join(", ") || null;

  function reset() {
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setPhone("");
    setNida("");
    setRelationship(null);
    setOccupation("");
    setGender(null);
    setMaritalStatus(null);
    setPassport(null);
    setRegionId(null);
    setDistrictId(null);
    setWard("");
    setStreet("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">(1)(a) Create guarantor information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="First Name" required>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Middle name">
            <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
          </Field>
          <Field label="Last name">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
          <Field label="Phone number" required>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0754000000" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Gender">
            {/* GENDERS mirrors the backend `Gender` enum and is the same source
                the customer wizard reads; the submission is validated against
                it by `Rule::in(Gender::values())`. */}
            <Combobox
              value={gender}
              onChange={setGender}
              options={GENDERS.map((g) => ({ value: g, label: g }))}
              placeholder="Select"
            />
          </Field>
          <Field label="Marital Status">
            <Combobox
              value={maritalStatus}
              onChange={setMaritalStatus}
              options={MARITAL_STATUSES.map((m) => ({ value: m, label: m }))}
              placeholder="Select"
            />
          </Field>
          <Field label="Identification Number">
            <Input value={nida} onChange={(e) => setNida(e.target.value)} />
          </Field>
          <Field label="Relationship with Customer" required>
            {/* The backend enum, not a hand-written list. */}
            <Combobox
              value={relationship}
              onChange={setRelationship}
              options={GUARANTOR_RELATIONSHIPS.map((r) => ({ value: r, label: r }))}
              placeholder="Select"
            />
          </Field>
          <Field label="Occupation">
            <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} />
          </Field>
          <Field label="Region">
            <Combobox
              value={regionId}
              loadOptions={regionLoader}
              loadKey="regions"
              placeholder="Select region"
              emptyMessage="No regions are on file yet. They are imported under Administration → Geography."
              onChange={(v) => {
                setRegionId(v);
                // The district below now belongs to a different place.
                setDistrictId(null);
              }}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="District">
            <Combobox
              value={districtId}
              loadOptions={districtLoader}
              loadKey={regionId ?? null}
              disabled={!regionId}
              disabledMessage="Select a region first"
              placeholder="Select district"
              emptyMessage="No districts are on file for this region yet. They are imported under Administration → Geography."
              onChange={setDistrictId}
            />
          </Field>
          {/* Typed, like the customer wizard: the ward and street tables do not
              cover the country, and a dropdown that cannot offer the right
              answer produces a wrong one. */}
          <Field label="Ward">
            <Input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="Type the ward" />
          </Field>
          <Field label="Street">
            <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Type the street" />
          </Field>
          <Field label="Passport">
            {/* Straight to the private KYC disk, through the same storage
                service every other KYC document uses. The API rules — PDF or
                image, 10 MB — are the authority; nothing is accepted here and
                dropped later. */}
            <div className="flex h-9 items-center gap-2 rounded-md border px-2">
              <Paperclip className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                aria-label="Guarantor passport"
                className="border-0 p-0 shadow-none focus-visible:ring-0"
                onChange={(e) => setPassport(e.target.files?.[0] ?? null)}
              />
            </div>
            {passport && (
              <p className="truncate text-[12px] text-muted-foreground">{passport.name}</p>
            )}
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              className="w-full"
              disabled={!canSubmit || pending || busy}
              onClick={() =>
                startTransition(async () => {
                  const result = await addGuarantor(
                    customerId,
                    {
                      name,
                      phone: phone.trim(),
                      nidaNumber: nida.trim() || null,
                      gender,
                      maritalStatus,
                      relationship,
                      address,
                      occupation: occupation.trim() || null,
                    },
                    passport
                  );

                  if (!result.ok) {
                    toast.error(result.message);
                    return;
                  }

                  toast.success(result.message);
                  reset();
                  await onCreated();
                })
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Add guarantor
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------- (1)(b) import a guarantor */

function ImportGuarantorCard({
  customerId,
  onImported,
  busy,
}: {
  customerId: string;
  onImported: () => Promise<void>;
  busy: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = React.useState<string | null>(null);
  const [relationship, setRelationship] = React.useState<string | null>(null);
  const [pool, setPool] = React.useState<ImportableGuarantor[]>([]);

  /*
   * Loaded through the Combobox's own loader so the request happens when the
   * control is opened rather than on every render of the application form. The
   * API caps and orders the result; nothing is filtered here.
   */
  const load = React.useCallback(async () => {
    const result = await searchImportableGuarantors("");

    if (!result.ok) {
      toast.error(result.message ?? "Could not load existing guarantors.");
      return [];
    }

    setPool(result.guarantors);

    return result.guarantors.map((g) => ({
      value: g.id,
      label: g.name,
      /* Two guarantors can share a name; who they already stand for is what
         tells them apart. */
      hint: [
        g.phone,
        g.gender,
        g.customerName ? `stands for ${g.customerName}` : null,
        g.passportUrl ? "has passport" : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  }, []);

  const source = pool.find((g) => g.id === chosen) ?? null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">(1)(b) Import guarantors</CardTitle>
        <p className="text-xs text-muted-foreground">
          Somebody already on file. Every stored detail — name, phone, ID number, gender, marital
          status, address, occupation and the passport — is copied onto this customer as a
          guarantor of their own. The original record is not moved or shared.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <Field label="Select">
          <Combobox
            value={chosen}
            onChange={setChosen}
            loadOptions={load}
            loadKey="guarantors"
            placeholder="Select guarantors"
            emptyMessage="No guarantors are on file yet."
          />
        </Field>
        <Field label="Relationship with customer" required>
          <Combobox
            value={relationship}
            onChange={setRelationship}
            options={GUARANTOR_RELATIONSHIPS.map((r) => ({ value: r, label: r }))}
            placeholder="Select"
          />
        </Field>
        <div className="flex items-end">
          <Button
            type="button"
            className="w-full"
            disabled={!source || !relationship || pending || busy}
            onClick={() =>
              startTransition(async () => {
                if (!source || !relationship) return;

                const result = await importGuarantor(customerId, source, relationship);

                if (!result.ok) {
                  toast.error(result.message);
                  return;
                }

                toast.success(result.message);
                setChosen(null);
                setRelationship(null);
                await onImported();
              })
            }
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Import
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}:{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
