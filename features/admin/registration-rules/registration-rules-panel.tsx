"use client";

import * as React from "react";
import { Check, Info, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SettingsCard } from "@/components/settings";
import { cn } from "@/lib/utils";
import { saveEligibility, saveRequirements } from "@/features/admin/registration-rules/actions";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";
import type { MasterDataOption } from "@/lib/api/master-data";
import type { CustomerCategory } from "@/types/customer";
import type { CategoryProductEligibility, LoanProduct } from "@/types/loan-product";

/**
 * Administration → Registration & Eligibility Rules.
 *
 * Two things an administrator previously could only change with a database
 * client: what registration demands of a customer, and which products each
 * customer type may borrow.
 *
 * THE DOCUMENT SWITCH IS THE DELICATE ONE. Turning "customer type documents block
 * KYC" on without a cutoff applies it to everybody already on the book —
 * including customers registered before anyone was asked for a document, who
 * would stop being able to borrow the moment it was saved. The cutoff makes it
 * apply from a date forward, and the screen says so plainly rather than
 * leaving an administrator to discover it.
 */
export function RegistrationRulesPanel({
  profiles,
  accountTypes,
  categories,
  products,
  eligibility,
}: {
  profiles: AccountTypeRequirementProfile[];
  accountTypes: MasterDataOption[];
  categories: CustomerCategory[];
  products: LoanProduct[];
  eligibility: CategoryProductEligibility[];
}) {
  return (
    <div className="space-y-6">
      <RequirementsSection profiles={profiles} accountTypes={accountTypes} />
      <EligibilitySection categories={categories} products={products} eligibility={eligibility} />
    </div>
  );
}

/* ------------------------------------------------- what registration asks -- */

function RequirementsSection({
  profiles,
  accountTypes,
}: {
  profiles: AccountTypeRequirementProfile[];
  accountTypes: MasterDataOption[];
}) {
  const [selected, setSelected] = React.useState(profiles[0]?.accountTypeId ?? null);

  const profile =
    profiles.find((p) => p.accountTypeId === selected) ?? profiles[0] ?? null;

  if (!profile) {
    return (
      <SettingsCard title="Registration requirements" description="What each account type demands.">
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No requirement profiles exist. Add an account type under Administration → Master Data;
          each one can then carry its own rules.
        </p>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard
      title="Registration requirements"
      description="What a customer must produce before their KYC is complete. Set per account type."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {profiles.map((p) => {
            const label = p.isDefault
              ? "Default"
              : (accountTypes.find((a) => a.id === p.accountTypeId)?.name ?? "Account type");

            return (
              <button
                key={p.accountTypeId ?? "default"}
                type="button"
                onClick={() => setSelected(p.accountTypeId)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm",
                  p.accountTypeId === profile.accountTypeId ? "bg-muted font-medium" : "hover:bg-muted/60",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <RequirementsForm
          key={profile.accountTypeId ?? "default"}
          profile={profile}
          canSave={profile.accountTypeId !== null}
        />
      </div>
    </SettingsCard>
  );
}

function RequirementsForm({
  profile,
  canSave,
}: {
  profile: AccountTypeRequirementProfile;
  canSave: boolean;
}) {
  const [form, setForm] = React.useState(profile);
  const [pending, setPending] = React.useState(false);

  const set = <K extends keyof AccountTypeRequirementProfile>(
    k: K,
    v: AccountTypeRequirementProfile[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const enforcingWithoutCutoff = form.requiresCategoryDocuments && !form.categoryDocumentsEnforcedFrom;

  async function submit() {
    if (!form.accountTypeId) return;

    setPending(true);
    const { accountTypeId, isDefault, ...payload } = form;
    void isDefault;
    const result = await saveRequirements(accountTypeId, payload);
    setPending(false);

    if (!result.ok) toast.error(result.message ?? "Could not save.");
    else toast.success(result.message);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle label="Employment details" checked={form.requiresEmploymentDetails} onChange={(v) => set("requiresEmploymentDetails", v)} />
        <Toggle label="Business details" checked={form.requiresBusinessDetails} onChange={(v) => set("requiresBusinessDetails", v)} />
        <Toggle label="Bank account" checked={form.requiresBankAccount} onChange={(v) => set("requiresBankAccount", v)} />
        <Toggle label="Card details" checked={form.requiresCardDetails} onChange={(v) => set("requiresCardDetails", v)} />
        <Toggle label="Customer type" checked={form.requiresCustomerCategory} onChange={(v) => set("requiresCustomerCategory", v)} />
        <Toggle label="Marital status" checked={form.requiresMaritalStatus} onChange={(v) => set("requiresMaritalStatus", v)} />
        <Toggle label="Address" checked={form.requiresAddress} onChange={(v) => set("requiresAddress", v)} />
        <Toggle label="Identity document" checked={form.requiresIdentityDocument} onChange={(v) => set("requiresIdentityDocument", v)} />
        <Toggle label="Face verification" checked={form.requiresFaceVerification} onChange={(v) => set("requiresFaceVerification", v)} />
        <Toggle
          label="NIDA verification"
          hint="Reported as blocked until the registry integration exists."
          checked={form.requiresNidaVerification}
          onChange={(v) => set("requiresNidaVerification", v)}
        />
        <Toggle
          label="SMS OTP verification"
          hint="Reported as blocked until an SMS gateway is configured."
          checked={form.requiresOtpVerification}
          onChange={(v) => set("requiresOtpVerification", v)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="min-guarantors">Minimum guarantors</Label>
          <Input
            id="min-guarantors"
            type="number"
            min={0}
            max={10}
            value={form.minGuarantors}
            onChange={(e) => set("minGuarantors", Number(e.target.value))}
          />
          <p className="text-[11px] text-muted-foreground">
            Enforced at registration. The loan gate still applies its own minimum of one — see the
            follow-up note in the repository.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="min-kin">Minimum next of kin</Label>
          <Input
            id="min-kin"
            type="number"
            min={0}
            max={10}
            value={form.minNextOfKin}
            onChange={(e) => set("minNextOfKin", Number(e.target.value))}
          />
        </div>
      </div>

      {/* ------------------------------------------ the document switch */}
      <div className="space-y-3 rounded-lg border p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
          Customer type documents
        </h4>

        <Toggle
          label="Missing customer type documents block KYC"
          hint="Each customer type names the documents it requires. Off, they are a checklist; on, they are a gate."
          checked={form.requiresCategoryDocuments}
          onChange={(v) => set("requiresCategoryDocuments", v)}
        />

        <div className="space-y-1.5">
          <Label htmlFor="doc-cutoff">Enforce from</Label>
          <Input
            id="doc-cutoff"
            type="date"
            value={form.categoryDocumentsEnforcedFrom ?? ""}
            onChange={(e) => set("categoryDocumentsEnforcedFrom", e.target.value || null)}
            disabled={!form.requiresCategoryDocuments}
          />
          <p className="text-[11px] text-muted-foreground">
            Applies only to customers registered on or after this date, read from their own
            registration date. Leave it empty to apply to everybody.
          </p>
        </div>

        {enforcingWithoutCutoff && (
          /* The one combination that can take the existing book's eligibility
             away in a single save. Said before it happens, not after. */
          <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 text-xs">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
            <span>
              With no date, this applies to <strong>every customer already registered</strong>.
              Any of them missing a document their category requires will stop being loan-eligible
              the next time their KYC is recomputed. Set a date unless that is what you intend.
            </span>
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="guidance">Guidance shown to the officer</Label>
        <Textarea
          id="guidance"
          rows={2}
          value={form.guidance ?? ""}
          onChange={(e) => set("guidance", e.target.value || null)}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {canSave
            ? "Applies to registrations started after it is saved."
            : "The default profile is the fallback for account types with no rules of their own and is not edited here."}
        </p>
        <Button type="button" onClick={submit} disabled={pending || !canSave}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
          Save
        </Button>
      </div>
    </div>
  );
}

/* --------------------------------------------------- who may borrow what -- */

function EligibilitySection({
  categories,
  products,
  eligibility,
}: {
  categories: CustomerCategory[];
  products: LoanProduct[];
  eligibility: CategoryProductEligibility[];
}) {
  const [categoryId, setCategoryId] = React.useState(categories[0]?.id ?? "");

  return (
    <SettingsCard
      title="Loan product availability"
      description="Which loan products each customer type may borrow, and the ceiling on each. A product not ticked is refused by the loan gate."
    >
      {categories.length === 0 || products.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {categories.length === 0
            ? "No customer types exist yet. Add them at Administration → Customer Types."
            : "No loan products exist yet. Add them at Administration → Loan Products."}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="elig-category">Customer Type</Label>
            <select
              id="elig-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Keyed on the customer type so switching it remounts the form and
              its rows reset from that type's rules — no render-phase sync. */}
          <EligibilityRules
            key={categoryId}
            categoryId={categoryId}
            products={products}
            eligibility={eligibility.filter((e) => e.customerCategoryId === categoryId)}
          />
        </div>
      )}
    </SettingsCard>
  );
}

function EligibilityRules({
  categoryId,
  products,
  eligibility,
}: {
  categoryId: string;
  products: LoanProduct[];
  eligibility: CategoryProductEligibility[];
}) {
  const [pending, setPending] = React.useState(false);

  const [rules, setRules] = React.useState<Record<string, { on: boolean; max: string }>>(() =>
    Object.fromEntries(
      products.map((p) => {
        const rule = eligibility.find((e) => e.loanProductId === p.id);

        /* The override is a decimal STRING on the wire; String() keeps it one
           rather than letting a number round the shillings. */
        return [
          p.id,
          { on: rule !== undefined, max: rule?.maxAmountOverride == null ? "" : String(rule.maxAmountOverride) },
        ];
      }),
    ),
  );

  async function submit() {
    setPending(true);
    const result = await saveEligibility(
      categoryId,
      Object.entries(rules)
        .filter(([, v]) => v.on)
        .map(([loanProductId, v]) => ({
          loanProductId,
          maxAmountOverride: v.max.trim() === "" ? null : v.max.trim(),
        })),
    );
    setPending(false);

    if (!result.ok) toast.error(result.message ?? "Could not save.");
    else toast.success(result.message);
  }

  return (
    <div className="space-y-4">
        <ul className="divide-y rounded-lg border">
          {products.map((p) => {
            const rule = rules[p.id] ?? { on: false, max: "" };

            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
                <Switch
                  checked={rule.on}
                  onCheckedChange={(on) => setRules((r) => ({ ...r, [p.id]: { ...rule, on } }))}
                  aria-label={`Allow ${p.name}`}
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {p.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    product maximum {p.maxAmount}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`max-${p.id}`} className="text-xs text-muted-foreground">
                    Category cap
                  </Label>
                  <Input
                    id={`max-${p.id}`}
                    value={rule.max}
                    disabled={!rule.on}
                    onChange={(e) => setRules((r) => ({ ...r, [p.id]: { ...rule, max: e.target.value } }))}
                    placeholder="Product max"
                    className="h-8 w-36"
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Leave a cap empty to use the product&apos;s own maximum. Saving replaces this
            category&apos;s whole set.
          </p>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
            Save eligibility
          </Button>
        </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <div className="space-y-0.5">
        <p className="text-sm">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
