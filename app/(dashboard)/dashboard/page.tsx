import Link from "next/link";
import { Eye, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { getDashboardData } from "@/lib/api/dashboard";
import { LEGACY_ACTIONS } from "@/config/legacy-actions";
import {
  LegacyBreadcrumb,
  LegacyCount,
  LegacyTable,
  LegacyTd,
  LegacyTh,
  legacyNumber,
} from "@/components/legacy/legacy-primitives";
import { AccountBalanceTile, BranchListButton, LinkTile } from "@/features/dashboard/dashboard-dialogs";

/** The four summary tiles, in the old screen's order and colours. */
/**
 * The four summary tiles, in the old screen's order and colours.
 *
 * `href` is where the tile's figure comes from. Account Balance has none
 * because it opens the company account breakdown instead.
 */
const TILES = [
  { key: "accountBalance", label: "Account Balance", color: "#4caf50", href: null },
  { key: "loanWithdrawal", label: "Loan Withdrawal", color: "#f0b429", href: "/loans/withdrawal" },
  {
    key: "expectationReceivable",
    label: "Expectation Receivable",
    color: "#2196f3",
    href: "/reports/today-receivable",
  },
  { key: "defaultLoan", label: "Default Loan", color: "#e2564a", href: "/reports/default-loan" },
] as const;

export default async function DashboardPage() {
  const [user, data] = await Promise.all([getCurrentUser(), getDashboardData()]);

  const actions = LEGACY_ACTIONS.filter(
    (a) => !a.permission || (user ? hasPermission(user, a.permission) : false)
  );

  // Each column carries its own labels; the table is as tall as the longest.
  const columns = [
    data.today.customerType,
    data.today.deposit,
    data.today.withdrawal,
    data.today.income,
    data.today.expenses,
  ];
  const rows = Array.from({ length: Math.max(...columns.map((c) => c.length)) }, (_, i) => i);
  const columnTotal = (cells: { value: number | null }[]) =>
    cells.reduce((sum, cell) => sum + (cell.value ?? 0), 0);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-y-4">
        <LegacyBreadcrumb trail={["Dashboard"]} />
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          {data.accounts.map((account) => (
            <div key={account.label}>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--lg-muted)]">
                {account.label}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[15px] text-[var(--lg-text)]">
                <Wallet className="size-4 text-[var(--lg-muted)]" strokeWidth={1.6} aria-hidden />
                <span className="font-tabular">{legacyNumber(account.value)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="lg-card p-4">
        <div className="mb-4 flex justify-end">
          {/* Was a button with no handler. Opens the per-branch breakdown. */}
          <BranchListButton rows={data.branchAccounts} />
        </div>
        <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-4">
          {TILES.map((tile) =>
            /*
             * Account Balance opens the company account list; the other three
             * are still plain tiles, because there is no per-account breakdown
             * behind them to show. A tile that opens an empty dialog is worse
             * than one that does not open.
             */
            tile.key === "accountBalance" ? (
              <AccountBalanceTile
                key={tile.key}
                value={data.accountBalance}
                label={tile.label}
                color={tile.color}
                rows={data.companyAccounts}
              />
            ) : (
              <LinkTile
                key={tile.key}
                value={data[tile.key]}
                label={tile.label}
                color={tile.color}
                href={tile.href!}
              />
            )
          )}
        </div>
      </section>

      <section className="lg-card">
        <LegacyTable>
          <thead>
            <tr>
              <LegacyTh>Customer Type</LegacyTh>
              <LegacyTh>Today Deposit</LegacyTh>
              <LegacyTh>Today Withdrawal</LegacyTh>
              <LegacyTh>Today Income</LegacyTh>
              <LegacyTh>Today Expenses</LegacyTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i}>
                {columns.map((cells, col) => {
                  const cell = cells[i];
                  return (
                    <LegacyTd key={col}>
                      {!cell || cell.value === null ? (
                        cell?.label ?? "-"
                      ) : (
                        <LegacyCount label={cell.label} value={cell.value} />
                      )}
                    </LegacyTd>
                  );
                })}
              </tr>
            ))}
            <tr className="font-medium" style={{ background: "var(--lg-head)" }}>
              <LegacyTd>All customer: {legacyNumber(data.totalCustomers)}</LegacyTd>
              <LegacyTd>Total: {legacyNumber(columnTotal(data.today.deposit))}</LegacyTd>
              <LegacyTd>Total: {legacyNumber(columnTotal(data.today.withdrawal))}</LegacyTd>
              {/* The old footer prints "Total :" in this one column. */}
              <LegacyTd>Total : {legacyNumber(columnTotal(data.today.income))}</LegacyTd>
              <LegacyTd>Total: {legacyNumber(columnTotal(data.today.expenses))}</LegacyTd>
            </tr>
          </tbody>
        </LegacyTable>
      </section>

      <div className="grid gap-7 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        {actions.map((action) => {
          const body = (
            <>
              <action.icon
                className="size-10"
                strokeWidth={1.4}
                style={{ color: action.color }}
                aria-hidden
              />
              <span className="mt-2 text-center text-[15px] text-[var(--lg-text)]">{action.label}</span>
            </>
          );

          return action.href ? (
            <Link
              key={action.label}
              href={action.href}
              className="lg-card lg-action flex flex-col items-center justify-center px-3 py-5"
            >
              {body}
            </Link>
          ) : (
            <span
              key={action.label}
              aria-disabled="true"
              className="lg-card flex flex-col items-center justify-center px-3 py-5"
            >
              {body}
            </span>
          );
        })}
      </div>

      <section className="lg-card">
        <LegacyTable>
          <thead>
            <tr>
              <LegacyTh>Customer Type</LegacyTh>
              <LegacyTh>All Customer</LegacyTh>
              <LegacyTh>Active</LegacyTh>
              <LegacyTh>Pending</LegacyTh>
              <LegacyTh>Close</LegacyTh>
              <LegacyTh>Default</LegacyTh>
              <LegacyTh>Male</LegacyTh>
              <LegacyTh>Female</LegacyTh>
              <LegacyTh>Action</LegacyTh>
            </tr>
          </thead>
          <tbody>
            {data.byType.map((row, i) => (
              <tr key={row.type} style={i % 2 === 0 ? { background: "var(--lg-hover)" } : undefined}>
                <LegacyTd>{row.type}</LegacyTd>
                <LegacyTd className="font-tabular">{legacyNumber(row.all)}</LegacyTd>
                <LegacyTd className="font-tabular">{legacyNumber(row.active)}</LegacyTd>
                <LegacyTd className="font-tabular">{legacyNumber(row.pending)}</LegacyTd>
                <LegacyTd className="font-tabular">{legacyNumber(row.close)}</LegacyTd>
                <LegacyTd className="font-tabular">{legacyNumber(row.default)}</LegacyTd>
                <LegacyTd className="font-tabular">{legacyNumber(row.male)}</LegacyTd>
                <LegacyTd className="font-tabular">{legacyNumber(row.female)}</LegacyTd>
                <LegacyTd>
                  {row.href && (
                    <Link
                      href={row.href}
                      aria-label={`View ${row.type} customers`}
                      className="inline-flex items-center justify-center rounded px-2 py-1"
                      style={{ background: "var(--lg-link)", color: "var(--lg-on-link)" }}
                    >
                      <Eye className="size-4" strokeWidth={2} aria-hidden />
                    </Link>
                  )}
                </LegacyTd>
              </tr>
            ))}
            <tr className="font-medium" style={{ background: "var(--lg-head)" }}>
              <LegacyTd>All Customer</LegacyTd>
              {(["all", "active", "pending", "close", "default", "male", "female"] as const).map((key) => (
                <LegacyTd key={key} className="font-tabular">
                  {legacyNumber(data.byType.reduce((sum, row) => sum + row[key], 0))}
                </LegacyTd>
              ))}
              <LegacyTd />
            </tr>
          </tbody>
        </LegacyTable>
      </section>
    </div>
  );
}
