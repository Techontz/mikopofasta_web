"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CreditCard, Landmark, Users } from "lucide-react";
import { SettingsCard, StatCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { AwaitingBackendNote } from "@/features/legacy-modules/shared";

/**
 * VISA → Bank Account & password.
 *
 * LAYOUT ONLY. The fourth of the four modules whose capture overturned what had
 * been inferred from its menu label: this was built as a card register — masked
 * PANs, issue and expiry dates, a card status — because "VISA" is all the
 * sidebar says. The real screen is a list of customers' BANK ACCOUNTS, and VISA
 * is one column on it.
 *
 * That column is empty on all ten captured rows, so what it holds is still
 * unknown: a card number, a flag, a status. It is rendered, because the old
 * screen renders it.
 *
 * WHY THE TABLE IS EMPTY. This screen used to draw ten rows transcribed off the
 * legacy screenshots — real names, real phone numbers, real bank accounts,
 * belonging to real people, typed out of a picture. They rendered here
 * identically to live data, with a working search and working filters over
 * them, which is precisely the problem: nothing on the screen distinguished a
 * transcribed row from a fetched one, and an officer reading this list had no
 * way to know they were looking at a partial snapshot of the old system rather
 * than this institution's customer book.
 *
 * There is no endpoint to replace them with. `CustomerBankDetailResource`
 * exists on the backend and no controller returns it; the customer show and
 * index responses carry no bank details at all. So the rows are gone and the
 * screen says why. The columns, the tiles and the headings are unchanged — this
 * needs a data source, not a redesign.
 *
 * The screen's own title mentions a password. No password, and no column that
 * could hold one, appears anywhere in the capture, and none is rendered here.
 */

type BankAccountRow = Record<string, never>;

export function VisaPanel() {
  const columns: ColumnDef<BankAccountRow>[] = [
    { id: "row", header: "S/No." },
    { id: "customerName", header: "Customer name" },
    { id: "phone", header: "Phone Number" },
    // "Acount name" is the legacy heading's own spelling; corrected here, like
    // every other label we author.
    { id: "accountName", header: "Account name" },
    { id: "visa", header: "VISA" },
    { id: "actions", header: () => <span className="block text-right">Action</span> },
  ];

  return (
    <div className="space-y-6">
      <AwaitingBackendNote module="VISA" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bank Accounts" value={0} icon={Landmark} tone="accent" />
        <StatCard label="With an account" value={0} icon={Users} />
        <StatCard
          label="Missing an account"
          value={0}
          icon={Users}
          hint="Registered, but no bank recorded"
        />
        <StatCard label="With a VISA" value={0} icon={CreditCard} />
      </div>

      <SettingsCard
        title="Bank Account List"
        description="Each customer's bank account, and whether a VISA sits against it."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={[]}
          emptyState={{
            icon: Landmark,
            title: "No records to show",
            description:
              "Customer bank accounts are not exposed by the API yet, so this list has nothing to read from.",
          }}
        />
      </SettingsCard>
    </div>
  );
}
