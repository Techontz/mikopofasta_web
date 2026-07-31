"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  FileText,
  MessageSquare,
  Paperclip,
  Percent,
  Printer,
  Receipt,
  ShieldAlert,
  TrendingUp,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import {
  Money,
  SettingsCard,
  StatCard,
  StatusBadge,
  type StatusTone,
} from "@/components/settings";
import { SettingsDialog } from "@/components/settings/dialog";
import { SettingsTable } from "@/components/settings/table";
import {
  ActionButtons,
  Button,
  DateInput,
  Field,
  FieldGrid,
  Select,
  TextInput,
} from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import { LEGACY_BALANCE_ROWS, LEGACY_BRANCHES, LEGACY_PROFILE_VALUES } from "@/lib/legacy/source";
import { InferredLookups } from "@/lib/legacy/inferred";
import type {
  CustomerProfile,
  KycState,
  ProfileGuarantor,
  ProfileLoan,
} from "@/lib/legacy/profile-fixtures";

/**
 * Customer → Customer Profile, for one customer.
 *
 * DESIGN ONLY. Every value comes from `lib/legacy/profile-fixtures.ts`, which
 * is explicit about which of them were read off a legacy screen and which were
 * invented. Nothing here saves; the Update buttons are the legacy screen's and
 * are rendered disabled.
 *
 * Built against the capture of /admin/customer_profile/2979, which corrected
 * several things an earlier pass had guessed from a written brief:
 *
 *   - Additional Details holds Nick name, Marital Status, Account Type, Busines
 *     Type, Place of Busines, Number of Dependents and Monthly income — not the
 *     identity-and-next-of-kin set the brief described. Those fields exist, but
 *     on other tabs.
 *   - Guarantors is a table with eleven columns, not a pair of cards.
 *   - Balance is a MODAL over whatever tab is open, with three fixed rows.
 *   - Back is the ninth tab, and leaves the profile.
 *   - Every editable tab ends in its own Update button.
 *
 * Legacy label spellings — "Aditional", "Gualantors", "Martial", "Busines" —
 * are corrected here, as every label this app draws is. Stored values are left
 * exactly as the old system holds them.
 */

const TABS = [
  { key: "basic", label: "Basic" },
  { key: "additional", label: "Additional Details" },
  { key: "bank", label: "Passport & Bank Details" },
  { key: "guarantors", label: "Guarantors" },
  { key: "loans", label: "All Loans" },
  { key: "mark", label: "Mark" },
  { key: "kyc", label: "KYC status" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const KYC_TONE: Record<KycState, StatusTone> = {
  verified: "active",
  pending: "warning",
  rejected: "danger",
};

const KYC_LABEL: Record<KycState, string> = {
  verified: "Approved",
  pending: "Pending",
  rejected: "Rejected",
};

const STATEMENTS = ["Loan statement", "Savings statement", "Full account statement"];

export function LegacyProfileView({ profile }: { profile: CustomerProfile }) {
  const [tab, setTab] = React.useState<TabKey>("basic");
  const [balanceOpen, setBalanceOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <ProfileHeader profile={profile} />
      <ProfileStats profile={profile} />

      <div>
        <TabBar current={tab} onSelect={setTab} onBalance={() => setBalanceOpen(true)} />
        {/*
          `key` restarts the fade on every tab change. Without it React reuses
          the element and the animation only ever plays once.
        */}
        <div key={tab} className="st-fade-in mt-4">
          {tab === "basic" && <BasicInformation profile={profile} />}
          {tab === "additional" && <AdditionalDetails profile={profile} />}
          {tab === "bank" && <PassportAndBank profile={profile} />}
          {tab === "guarantors" && <Guarantors profile={profile} />}
          {tab === "loans" && <AllLoans profile={profile} />}
          {tab === "mark" && <Mark profile={profile} />}
          {tab === "kyc" && <KycStatus profile={profile} />}
        </div>
      </div>

      <BalanceDialog profile={profile} open={balanceOpen} onOpenChange={setBalanceOpen} />
    </div>
  );
}

/* ----------------------------------------------------------------- header */

/**
 * The summary card: three columns of facts under the name, as the old one has.
 *
 * The photo is an initials avatar. There is no photograph for any of these
 * customers — the legacy system serves them from its own host — and an initials
 * block is honest about that where a stock portrait would not be.
 */
function ProfileHeader({ profile }: { profile: CustomerProfile }) {
  return (
    <section className="st-card overflow-hidden">
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="flex size-16 shrink-0 items-center justify-center rounded-[var(--st-radius-md)] text-[20px] font-semibold"
            style={{
              background: "var(--st-accent-soft)",
              color: "var(--st-accent)",
              border: "1px solid var(--st-accent-line)",
            }}
          >
            {profile.initials}
          </span>

          <div className="min-w-0">
            <h2 className="text-[19px] font-semibold leading-tight tracking-[-0.018em] text-[var(--st-ink)]">
              {profile.shortName}
            </h2>
            <p className="font-tabular mt-1 text-[13px] text-[var(--st-ink-faint)]">{profile.id}</p>
          </div>
        </div>

        <div className="lg:ml-6 lg:self-center">
          <StatusBadge tone={KYC_TONE[profile.kycStatus]}>
            KYC — {KYC_LABEL[profile.kycStatus]}
          </StatusBadge>
        </div>

        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <label className="sr-only" htmlFor="profile-statement">
            Statement
          </label>
          <Select id="profile-statement" defaultValue="" className="h-9 w-[200px]">
            <option value="">Statement…</option>
            {STATEMENTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="border-t px-5 py-4 sm:px-6" style={{ borderColor: "var(--st-line)" }}>
        <div className="grid gap-x-8 gap-y-5 lg:grid-cols-3">
          <dl className="space-y-2.5">
            <Row label="Create Date" value={profile.createDate} tabular />
            <Row label="Monthly Income" value={formatMoney(profile.monthlyIncome)} tabular />
            <Row label="Position" value={profile.businessType} />
            <Row label="Age" value={String(profile.age)} tabular />
            <Row label="Gender" value={profile.gender} />
            <div className="flex items-baseline gap-2">
              <dt className="text-[13px] font-semibold text-[var(--st-ink)]">Customer status:</dt>
              <dd>
                <StatusBadge tone={profile.status === "Active" ? "active" : "warning"}>
                  {profile.status}
                </StatusBadge>
              </dd>
            </div>
          </dl>

          <dl className="space-y-2.5">
            <Row label="Region" value={profile.region} />
            <Row label="District" value={profile.district} />
            <Row label="Ward" value={profile.ward} />
            <Row label="Street" value={profile.street} />
            <Row label="Place of business" value={profile.businessLocation} />
            <p className="text-[13px] text-[var(--st-accent)]">
              (NIDA) / Voter ID / Driver&apos;s Licence — {profile.nidaNumber}
            </p>
          </dl>

          <dl className="space-y-2.5">
            <Row label="Phone number" value={profile.phone} tabular />
            <div className="pt-1">
              <Button tone="danger" icon={MessageSquare} disabled>
                Send SMS
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <dt className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--st-ink)]">
                <Paperclip className="size-3.5" strokeWidth={1.9} aria-hidden />
                Attachment:
              </dt>
              {profile.attachments.map((a) => (
                <dd
                  key={a.name}
                  className="flex items-center gap-2 rounded-[var(--st-radius-sm)] border px-2.5 py-1 text-[12.5px] text-[var(--st-ink-soft)]"
                  style={{ borderColor: "var(--st-line-strong)" }}
                >
                  <FileText
                    className="size-3.5 text-[var(--st-ink-faint)]"
                    strokeWidth={1.9}
                    aria-hidden
                  />
                  {a.name}
                </dd>
              ))}
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

/** One "Label: value" line, as the legacy header prints them. */
function Row({ label, value, tabular }: { label: string; value: string; tabular?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <dt className="text-[13px] font-semibold text-[var(--st-ink)]">{label}:</dt>
      <dd className={cn("text-[13px] text-[var(--st-ink-soft)]", tabular && "font-tabular")}>
        {value}
      </dd>
    </div>
  );
}

function ProfileStats({ profile }: { profile: CustomerProfile }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Outstanding Loan"
        value={formatMoney(profile.balance.outstanding)}
        icon={Banknote}
        tone="accent"
      />
      <StatCard label="Total Paid" value={formatMoney(profile.balance.totalPaid)} icon={Receipt} />
      <StatCard
        label="Active Loans"
        value={profile.loans.filter((l) => l.status !== "Closed").length}
        icon={Wallet}
        hint={`${profile.loans.length} on the book`}
      />
      <StatCard label="Monthly Income" value={formatMoney(profile.monthlyIncome)} icon={TrendingUp} />
    </div>
  );
}

/* -------------------------------------------------------------------- tabs */

/**
 * The tab strip.
 *
 * Balance and Back are in it but are not tabs: Balance opens a modal over
 * whatever is currently showing, and Back leaves the profile. Both are drawn in
 * the strip because that is where the old screen puts them.
 */
function TabBar({
  current,
  onSelect,
  onBalance,
}: {
  current: TabKey;
  onSelect: (t: TabKey) => void;
  onBalance: () => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Customer profile"
      className="flex gap-1 overflow-x-auto rounded-lg p-1 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ background: "var(--st-subtle-strong)" }}
    >
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={current === t.key}
          onClick={() => onSelect(t.key)}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition-colors",
            current === t.key
              ? "bg-[var(--st-card)] text-[var(--st-ink)] shadow-sm"
              : "text-[var(--st-ink-soft)] hover:text-[var(--st-ink)]"
          )}
        >
          {t.label}
        </button>
      ))}

      <button
        type="button"
        onClick={onBalance}
        className="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-[var(--st-ink-soft)] transition-colors hover:text-[var(--st-ink)]"
      >
        Balance
      </button>

      <Link
        href="/customers/profile"
        className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-[var(--st-ink-soft)] transition-colors hover:text-[var(--st-ink)]"
      >
        <ArrowLeft className="size-3.5" strokeWidth={2} aria-hidden />
        Back
      </Link>
    </div>
  );
}

/**
 * The Update button every editable tab ends in.
 *
 * Disabled, like every other action on this design pass — the profile is not
 * wired to anything that could accept a change.
 */
function UpdateBar() {
  return (
    <ActionButtons align="end">
      <Button tone="primary" disabled>
        Update
      </Button>
    </ActionButtons>
  );
}

/* ------------------------------------------------------- Basic Information */

function BasicInformation({ profile }: { profile: CustomerProfile }) {
  return (
    <SettingsCard
      title="Basic Information"
      description="Who the customer is, which branch and officer they belong to, and where they live."
    >
      <div className="space-y-[18px]">
        <FieldGrid columns={3}>
          <Field label="First Name" htmlFor="p-first">
            <TextInput id="p-first" defaultValue={profile.firstName} />
          </Field>
          <Field label="Middle name" htmlFor="p-middle">
            <TextInput id="p-middle" defaultValue={profile.middleName} />
          </Field>
          <Field label="Last name" htmlFor="p-last">
            <TextInput id="p-last" defaultValue={profile.lastName} />
          </Field>
        </FieldGrid>

        <FieldGrid columns={3}>
          <Field label="Branch" htmlFor="p-branch">
            <Choice id="p-branch" value={profile.branch} options={LEGACY_BRANCHES} />
          </Field>
          <Field label="Employee" htmlFor="p-officer">
            <Choice
              id="p-officer"
              value={profile.loanOfficer}
              options={[...LEGACY_PROFILE_VALUES.employees, ...InferredLookups.employees]}
            />
          </Field>
          <Field label="Gender" htmlFor="p-gender">
            <Choice id="p-gender" value={profile.gender} options={InferredLookups.genders} />
          </Field>
        </FieldGrid>

        <FieldGrid columns={3}>
          <Field label="Date of Birth" htmlFor="p-dob">
            <DateInput id="p-dob" defaultValue={profile.dob} />
          </Field>
          {/* Confirmed by the capture: 23/07/2004 in the picker, 22 in this box. */}
          <Field label="Year" htmlFor="p-age" help="Age in whole years, from the date of birth.">
            <TextInput id="p-age" readOnly value={profile.age} />
          </Field>
          <Field label="Phone Number" htmlFor="p-phone">
            <TextInput id="p-phone" inputMode="tel" defaultValue={profile.phone} />
          </Field>
          <Field label="Loan Type" htmlFor="p-ltype">
            <Choice
              id="p-ltype"
              value={profile.loanType}
              options={[...LEGACY_PROFILE_VALUES.loanTypes, ...InferredLookups.loanTypes]}
            />
          </Field>
          <Field label="Types of customer" htmlFor="p-ctype">
            <Choice
              id="p-ctype"
              value={profile.customerType}
              options={[...LEGACY_PROFILE_VALUES.customerTypes, ...InferredLookups.customerTypes]}
            />
          </Field>
        </FieldGrid>

        <FieldGrid columns={3}>
          <Field label="Region" htmlFor="p-region">
            <Choice id="p-region" value={profile.region} options={InferredLookups.regions} />
          </Field>
          {/* Free text on the legacy form — there is no district or ward lookup. */}
          <Field label="District" htmlFor="p-district">
            <TextInput id="p-district" defaultValue={profile.district} />
          </Field>
          <Field label="Ward" htmlFor="p-ward">
            <TextInput id="p-ward" defaultValue={profile.ward} />
          </Field>
          <Field label="Street" htmlFor="p-street">
            <TextInput id="p-street" defaultValue={profile.street} />
          </Field>
        </FieldGrid>

        <UpdateBar />
      </div>
    </SettingsCard>
  );
}

/* ------------------------------------------------------- Additional Details */

/**
 * The fields the capture actually shows — not the identity-and-next-of-kin set
 * an earlier brief described. Those fields exist on the profile, but on the
 * Passport & Bank tab and in the guarantor record.
 */
function AdditionalDetails({ profile }: { profile: CustomerProfile }) {
  return (
    <SettingsCard
      title="Additional Details"
      description="How the customer earns, and what kind of account they hold."
    >
      <div className="space-y-[18px]">
        <FieldGrid columns={3}>
          <Field label="Nick name" htmlFor="p-nick">
            <TextInput id="p-nick" defaultValue={profile.nickName} />
          </Field>
          {/* The legacy label reads "Martial Status". */}
          <Field label="Marital Status" htmlFor="p-marital">
            <Choice
              id="p-marital"
              value={profile.maritalStatus}
              options={["Single", "Married", "Widowed", "Separated"]}
            />
          </Field>
          <Field label="Account Type" htmlFor="p-acctype">
            <Choice
              id="p-acctype"
              value={profile.accountType}
              options={LEGACY_PROFILE_VALUES.accountTypes}
            />
          </Field>
          <Field label="Business Type" htmlFor="p-btype">
            <TextInput id="p-btype" defaultValue={profile.businessType} />
          </Field>
        </FieldGrid>

        <FieldGrid columns={3}>
          <Field label="Place of Business" htmlFor="p-pob">
            <TextInput id="p-pob" defaultValue={profile.businessLocation} />
          </Field>
          <Field
            label="Number of Dependents"
            htmlFor="p-deps"
            /*
             * Worth flagging on screen: the captured record has a phone number
             * in this box. That is a fault in the legacy data, and it is the
             * kind of thing a migration should catch rather than carry.
             */
            help="The captured legacy record holds a phone number here."
          >
            <TextInput id="p-deps" inputMode="numeric" defaultValue={profile.numberOfDependents} />
          </Field>
          <Field label="Monthly income" htmlFor="p-income">
            <TextInput
              id="p-income"
              inputMode="numeric"
              defaultValue={profile.monthlyIncome}
              prefix="TSh"
            />
          </Field>
        </FieldGrid>

        <UpdateBar />
      </div>
    </SettingsCard>
  );
}

/* ---------------------------------------------------- Passport & Bank Details */

/**
 * Two numbered sections, as the capture draws them, then the bank block.
 *
 * The capture stops after section (2) and its Update button, so the bank fields
 * the tab is named for were below the fold and have not been seen. Section (3)
 * is therefore ours — the tab title is the only evidence those fields exist.
 */
function PassportAndBank({ profile }: { profile: CustomerProfile }) {
  return (
    <div className="space-y-4">
      <SettingsCard title="(1) Upload Passport">
        <div className="flex flex-wrap items-start gap-6">
          <Field label="Passport size" htmlFor="p-passport-file" className="min-w-[280px] flex-1">
            <input
              id="p-passport-file"
              type="file"
              accept="image/*"
              disabled
              className="st-control h-auto py-1.5 file:mr-3 file:rounded file:border-0 file:bg-[var(--st-subtle-strong)] file:px-3 file:py-1.5 file:text-[13px] file:text-[var(--st-ink-soft)]"
            />
          </Field>
          <div
            className="flex size-28 shrink-0 items-center justify-center rounded-[var(--st-radius-sm)] border text-[20px] font-semibold"
            style={{
              borderColor: "var(--st-line-strong)",
              background: "var(--st-subtle)",
              color: "var(--st-ink-faint)",
            }}
            aria-label="Current passport photo"
          >
            {profile.initials}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="(2) NIDA / Voter ID / Driver's Licence number">
        <div className="space-y-[18px]">
          <FieldGrid columns={2}>
            <Field label="ID number" htmlFor="p-idno">
              <TextInput id="p-idno" defaultValue={profile.nidaNumber} />
            </Field>
            <Field label="Upload Attachment (pdf)" htmlFor="p-idfile">
              <input
                id="p-idfile"
                type="file"
                accept="application/pdf"
                disabled
                className="st-control h-auto py-1.5 file:mr-3 file:rounded file:border-0 file:bg-[var(--st-subtle-strong)] file:px-3 file:py-1.5 file:text-[13px] file:text-[var(--st-ink-soft)]"
              />
            </Field>
          </FieldGrid>

          <Button tone="primary" icon={Upload} className="w-full justify-center" disabled>
            Update
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        title="(3) Bank Details"
        description="The capture stops above this point, so these fields are reasoned from the tab's own name rather than copied."
      >
        <div className="space-y-[18px]">
          <FieldGrid columns={3}>
            <Field label="Bank Name" htmlFor="p-bank">
              <Choice id="p-bank" value={profile.bankName} options={["NMB", "CRDB", "NBC"]} />
            </Field>
            <Field label="Account Name" htmlFor="p-acc-name">
              <TextInput id="p-acc-name" defaultValue={profile.accountName} />
            </Field>
            <Field label="Account Number" htmlFor="p-acc-no">
              <TextInput id="p-acc-no" defaultValue={profile.accountNumber} />
            </Field>
            <Field label="TIN Number" htmlFor="p-tin">
              <TextInput id="p-tin" defaultValue={profile.tinNumber} />
            </Field>
          </FieldGrid>

          <UpdateBar />
        </div>
      </SettingsCard>
    </div>
  );
}

/* ------------------------------------------------------------- Guarantors */

/** Eleven columns, as the captured Guarantors table has them. */
function Guarantors({ profile }: { profile: CustomerProfile }) {
  const columns: ColumnDef<ProfileGuarantor>[] = [
    {
      id: "row",
      header: "S/No.",
      cell: ({ row }) => (
        <span className="font-tabular text-[var(--st-ink-soft)]">{row.index + 1}</span>
      ),
    },
    { accessorKey: "firstName", header: "First Name" },
    {
      accessorKey: "middleName",
      header: "Middle Name",
      cell: ({ row }) =>
        row.original.middleName || <span className="text-[var(--st-ink-faint)]">—</span>,
    },
    { accessorKey: "lastName", header: "Last Name" },
    {
      accessorKey: "phone",
      header: "Phone Number",
      cell: ({ row }) => <span className="font-tabular">{row.original.phone}</span>,
    },
    { accessorKey: "relationship", header: "Relationship" },
    { accessorKey: "region", header: "Region" },
    { accessorKey: "district", header: "District" },
    { accessorKey: "ward", header: "Ward" },
    { accessorKey: "street", header: "Street" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge tone={KYC_TONE[row.original.status]}>
          {KYC_LABEL[row.original.status]}
        </StatusBadge>
      ),
    },
  ];

  return (
    <SettingsCard
      title="Guarantors List"
      description="The people standing behind this customer's borrowing."
      bodyClassName="pt-0 sm:pt-0"
    >
      <SettingsTable
        columns={columns}
        data={profile.guarantors}
        searchFields={["firstName", "lastName", "phone", "relationship"]}
        searchPlaceholder="Search guarantor…"
        emptyState={{
          icon: Users,
          title: "No data available in table",
          description: "No guarantor has been recorded against this customer.",
        }}
      />
    </SettingsCard>
  );
}

/* --------------------------------------------------------------- All Loans */

/** The captured column set, which is the loan lists' rather than the brief's. */
function AllLoans({ profile }: { profile: CustomerProfile }) {
  const columns: ColumnDef<ProfileLoan>[] = [
    {
      id: "row",
      header: "S/no.",
      cell: ({ row }) => (
        <span className="font-tabular text-[var(--st-ink-soft)]">{row.index + 1}</span>
      ),
    },
    {
      accessorKey: "account",
      header: "Loan Ac",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-tabular font-medium text-[var(--st-ink)]">{row.original.account}</p>
          {row.original.transcribed && (
            <p className="mt-0.5 text-[12px] text-[var(--st-ink-faint)]">From a captured screen</p>
          )}
        </div>
      ),
    },
    { accessorKey: "type", header: "Loan Product" },
    {
      accessorKey: "interestRate",
      header: () => <span className="block text-right">Loan Interest</span>,
      cell: ({ row }) => (
        <span className="font-tabular block text-right">{row.original.interestRate}%</span>
      ),
    },
    {
      accessorKey: "principal",
      header: () => <span className="block text-right">Loan Withdrawal</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.principal)}</Money>,
    },
    {
      accessorKey: "totalPayable",
      header: () => <span className="block text-right">Principal + interest</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.totalPayable)}</Money>,
    },
    { accessorKey: "durationType", header: "Duration Type" },
    {
      accessorKey: "installments",
      header: () => <span className="block text-right">Number of Repayment</span>,
      cell: ({ row }) => (
        <span className="font-tabular block text-right">{row.original.installments}</span>
      ),
    },
    {
      id: "restoration",
      header: () => <span className="block text-right">Restoration</span>,
      cell: ({ row }) => (
        <Money>{formatMoney(Math.round(row.original.totalPayable / row.original.installments))}</Money>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          tone={
            row.original.status === "Disbursed"
              ? "active"
              : row.original.status === "Pending"
                ? "warning"
                : "inactive"
          }
        >
          {row.original.status}
        </StatusBadge>
      ),
    },
    {
      accessorKey: "withdrawalDate",
      header: "Withdrawal Date",
      cell: ({ row }) => <span className="font-tabular">{row.original.withdrawalDate}</span>,
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => <span className="font-tabular">{row.original.endDate}</span>,
    },
  ];

  return (
    <SettingsCard
      title="All Loans"
      description="Every loan on this customer's record. Rows marked as captured came off a legacy screen; the rest of this profile is design data."
      bodyClassName="pt-0 sm:pt-0"
    >
      <SettingsTable
        columns={columns}
        data={profile.loans}
        searchFields={["account", "type", "status"]}
        searchPlaceholder="Search loan…"
        emptyState={{
          icon: Banknote,
          title: "No data available in table",
          description: "This customer has never borrowed.",
        }}
      />
    </SettingsCard>
  );
}

/* -------------------------------------------------------------------- Mark */

/**
 * Mark.
 *
 * The capture never opened this tab, and no brief describes it, so both the
 * shape and the figures are ours: a score out of a hundred per dimension, which
 * is what "mark" most plausibly means in a village-banking context. Says so on
 * screen rather than pretending otherwise.
 */
function Mark({ profile }: { profile: CustomerProfile }) {
  const average = Math.round(
    profile.marks.reduce((sum, m) => sum + m.score, 0) / Math.max(1, profile.marks.length)
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overall Mark" value={`${average}/100`} icon={BadgeCheck} tone="accent" />
        {profile.marks.map((m) => (
          <StatCard key={m.label} label={m.label} value={`${m.score}/100`} icon={Percent} />
        ))}
      </div>

      <SettingsCard
        title="Mark"
        description="The legacy Mark tab has never been captured and no brief describes it, so both the shape and the figures below are ours."
      >
        <ul className="space-y-4">
          {profile.marks.map((m) => (
            <li key={m.label}>
              <div className="mb-1.5 flex items-baseline justify-between gap-4">
                <span className="text-[13.5px] font-medium text-[var(--st-ink)]">{m.label}</span>
                <span className="font-tabular text-[13px] text-[var(--st-ink-soft)]">
                  {m.score}/100
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full"
                style={{ background: "var(--st-subtle-strong)" }}
                role="img"
                aria-label={`${m.label}: ${m.score} out of 100`}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${m.score}%`, background: "var(--st-accent)" }}
                />
              </div>
              <p className="mt-1.5 text-[12.5px] text-[var(--st-ink-soft)]">{m.detail}</p>
            </li>
          ))}
        </ul>
      </SettingsCard>
    </div>
  );
}

/* ----------------------------------------------------------- Balance modal */

/**
 * Balance.
 *
 * A modal over whatever tab is open, not a tab of its own — which is how the
 * capture shows it, twice, over two different tabs. Three fixed rows and a
 * TOTAL, with a print button in the corner.
 */
function BalanceDialog({
  profile,
  open,
  onOpenChange,
}: {
  profile: CustomerProfile;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const b = profile.balance;

  /* The legacy modal's three rows, in its order. */
  const rows = [
    { label: LEGACY_BALANCE_ROWS[0], amount: b.outstanding },
    { label: LEGACY_BALANCE_ROWS[1], amount: 0 },
    { label: LEGACY_BALANCE_ROWS[2], amount: b.totalPenalties },
  ];
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Customer Balance"
      description={`${profile.shortName} · ${profile.id}`}
      footer={
        <ActionButtons align="between">
          <Button tone="secondary" icon={Printer} disabled>
            Print
          </Button>
          <Button tone="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </ActionButtons>
      }
    >
      <table className="st-table w-full">
        <thead>
          <tr>
            <th className="w-16 text-left">S/no</th>
            <th className="text-left">Description</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.label}>
              <td className="font-tabular text-[var(--st-ink-soft)]">{i + 1}.</td>
              <td>{r.label}</td>
              <td>
                <Money muted={r.amount === 0}>{formatMoney(r.amount)}</Money>
              </td>
            </tr>
          ))}
          <tr className="st-total-row">
            <td colSpan={2} className="font-semibold text-[var(--st-ink)]">
              TOTAL
            </td>
            <td>
              <Money strong>{formatMoney(total)}</Money>
            </td>
          </tr>
        </tbody>
      </table>

      <p className="text-[12.5px] text-[var(--st-ink-soft)]">
        Salary Advance reads zero on every captured profile — no customer in the capture set holds
        one.
      </p>
    </SettingsDialog>
  );
}

/* -------------------------------------------------------------- KYC status */

function KycStatus({ profile }: { profile: CustomerProfile }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Overall"
          value={KYC_LABEL[profile.kycStatus]}
          icon={profile.kycStatus === "verified" ? BadgeCheck : ShieldAlert}
          tone="accent"
          hint="Every check must pass for this to read Approved"
        />
      </div>

      <SettingsCard
        title="KYC status"
        description="Each check, and where it has got to. Phone and address are derived from what the captured screens hold; the other two are design data."
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {profile.kyc.map((check) => (
            <li
              key={check.label}
              className="flex items-center justify-between gap-4 rounded-[var(--st-radius-sm)] border p-4"
              style={{ borderColor: "var(--st-line-strong)" }}
            >
              <span className="text-[13.5px] font-medium text-[var(--st-ink)]">{check.label}</span>
              <StatusBadge tone={KYC_TONE[check.state]}>{KYC_LABEL[check.state]}</StatusBadge>
            </li>
          ))}
        </ul>
      </SettingsCard>
    </div>
  );
}

/* ------------------------------------------------------------------ shared */

/**
 * A select already holding this customer's value.
 *
 * The value is added to the options when the lookup does not contain it — a
 * select that silently drops the stored value is how a record gets quietly
 * changed by somebody who only meant to look at it.
 */
function Choice({ id, value, options }: { id: string; value: string; options: readonly string[] }) {
  const all = options.includes(value) ? options : [value, ...options];
  return (
    <Select id={id} defaultValue={value}>
      {all.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </Select>
  );
}
