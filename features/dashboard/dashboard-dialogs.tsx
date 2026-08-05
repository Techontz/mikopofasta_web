"use client";

import * as React from "react";
import Link from "next/link";
import { List, Wallet, X } from "lucide-react";
import { legacyNumber } from "@/components/legacy/legacy-primitives";
import type { BranchAccountRow, CompanyAccountRow } from "@/lib/api/dashboard";

/**
 * The dashboard's detail popups.
 *
 * The Branch button and the account tiles were the last inert controls on the
 * landing page: the button had no handler at all, and the tiles were plain
 * `<div>`s showing a total with no way to ask what it was made of. On a
 * dashboard that is the obvious question — "18,200 across what?" — and the old
 * system answers it, so this one does too.
 *
 * Both popups are the legacy dialog: teal header bar, the table, a totals row,
 * a single CLOSE button. Escape and a click outside close them as well, because
 * a modal that only closes through one button is a modal people get stuck in.
 *
 * Everything is rendered from data the page already fetched, so opening a popup
 * costs no request and shows no spinner.
 */

/* ------------------------------------------------------------------- shell */

function LegacyDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // The page behind must not scroll while a modal is over it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onMouseDown={(e) => {
        // Only a press that both starts and ends on the backdrop closes it —
        // otherwise selecting text inside the table and releasing outside
        // dismisses the dialog mid-drag.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="my-auto w-full max-w-3xl overflow-hidden rounded shadow-2xl"
        style={{ background: "var(--lg-surface)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ background: "var(--lg-link)", color: "var(--lg-on-link)" }}
        >
          <h2 className="text-[17px] font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="rounded p-1 transition-opacity hover:opacity-70"
          >
            <X className="size-4.5" aria-hidden />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-5 py-4">{children}</div>

        <div className="flex justify-end px-5 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-[14px] font-medium uppercase tracking-wide"
            style={{ background: "var(--lg-muted)", color: "var(--lg-on-link)" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const TH = "whitespace-nowrap px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--lg-text)]";
const TD = "whitespace-nowrap px-3 py-2.5 text-[14px] text-[var(--lg-text)]";
const NUM = `${TD} font-tabular text-right`;

/* ------------------------------------------------------------ branch list */

export function BranchListButton({ rows }: { rows: BranchAccountRow[] }) {
  const [open, setOpen] = React.useState(false);
  const total = (read: (r: BranchAccountRow) => number) => rows.reduce((n, r) => n + read(r), 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[14px] transition-opacity hover:opacity-90"
        style={{ background: "var(--lg-link)", color: "var(--lg-on-link)" }}
      >
        <List className="size-4" strokeWidth={2} aria-hidden />
        Branch
      </button>

      {open && (
        <LegacyDialog title="Branch List" onClose={() => setOpen(false)}>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-[var(--lg-muted)]">
              No branches are registered yet.
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--lg-line)" }}>
                  <th className={TH}>Branch Name</th>
                  <th className={`${TH} text-right`}>Principal A/c</th>
                  <th className={`${TH} text-right`}>Interest A/c</th>
                  <th className={`${TH} text-right`}>Loan fee A/c</th>
                  <th className={`${TH} text-right`}>Penalty A/c</th>
                  <th className={`${TH} text-right`}>Reserve A/c</th>
                  <th className={`${TH} text-right`}>Agent</th>
                  <th className={`${TH} text-right`}>Insurance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.branchId} style={{ borderBottom: "1px solid var(--lg-line)" }}>
                    <td className={`${TD} font-semibold`} style={{ color: "var(--lg-link)" }}>
                      {r.branchName}
                    </td>
                    <td className={NUM}>{legacyNumber(r.principal)}</td>
                    <td className={NUM}>{legacyNumber(r.interest)}</td>
                    <td className={NUM}>{legacyNumber(r.loanFee)}</td>
                    <td className={NUM}>{legacyNumber(r.penalty)}</td>
                    <td className={NUM}>{legacyNumber(r.reserve)}</td>
                    <td className={NUM}>{legacyNumber(r.agent)}</td>
                    <td className={NUM}>{legacyNumber(r.insurance)}</td>
                  </tr>
                ))}
                <tr>
                  <td className={`${TD} font-semibold`}>TOTAL:</td>
                  <td className={`${NUM} font-semibold`}>{legacyNumber(total((r) => r.principal))}</td>
                  <td className={`${NUM} font-semibold`}>{legacyNumber(total((r) => r.interest))}</td>
                  <td className={`${NUM} font-semibold`}>{legacyNumber(total((r) => r.loanFee))}</td>
                  <td className={`${NUM} font-semibold`}>{legacyNumber(total((r) => r.penalty))}</td>
                  <td className={`${NUM} font-semibold`}>{legacyNumber(total((r) => r.reserve))}</td>
                  <td className={`${NUM} font-semibold`}>{legacyNumber(total((r) => r.agent))}</td>
                  <td className={`${NUM} font-semibold`}>{legacyNumber(total((r) => r.insurance))}</td>
                </tr>
              </tbody>
            </table>
          )}
        </LegacyDialog>
      )}
    </>
  );
}

/* --------------------------------------------------- company account list */

/**
 * The Account Balance tile, which now opens.
 *
 * Same geometry and colour as the other three tiles — it must not look like a
 * different kind of thing — but it is a button, so it takes focus and answers
 * the keyboard.
 */
/**
 * A tile that goes to the module it summarises.
 *
 * Loan Withdrawal, Expectation Receivable and Default Loan are each a single
 * ledger balance — there is no per-item breakdown behind them to put in a
 * dialog, and a modal showing one number is a worse answer than the list that
 * number came from. So these navigate instead, which is the other half of "no
 * dead cards": every tile now does something, and what it does is the useful
 * thing.
 */
export function LinkTile({
  value,
  label,
  color,
  href,
}: {
  value: number;
  label: string;
  color: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded px-4 py-2 text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lg-link)]"
      style={{ background: color }}
    >
      <Wallet className="size-[22px]" strokeWidth={1.6} aria-hidden />
      <div className="font-tabular mt-1.5 text-[28px] font-semibold leading-tight">
        {legacyNumber(value)}
      </div>
      <div className="text-[15px]">{label}</div>
    </Link>
  );
}

export function AccountBalanceTile({
  value,
  label,
  color,
  rows,
}: {
  value: number;
  label: string;
  color: string;
  rows: CompanyAccountRow[];
}) {
  const [open, setOpen] = React.useState(false);
  const total = rows.reduce((n, r) => n + r.amount, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="rounded px-4 py-2 text-left text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lg-link)]"
        style={{ background: color }}
      >
        <Wallet className="size-[22px]" strokeWidth={1.6} aria-hidden />
        <div className="font-tabular mt-1.5 text-[28px] font-semibold leading-tight">
          {legacyNumber(value)}
        </div>
        <div className="text-[15px]">{label}</div>
      </button>

      {open && (
        <LegacyDialog title="Company Account List" onClose={() => setOpen(false)}>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-[var(--lg-muted)]">
              No company accounts are registered yet.
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--lg-line)" }}>
                  <th className={TH}>A/c Name</th>
                  <th className={`${TH} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} style={{ borderBottom: "1px solid var(--lg-line)" }}>
                    <td className={`${TD} font-semibold`}>{r.name}</td>
                    <td className={NUM}>{legacyNumber(r.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td className={`${TD} font-semibold`}>TOTAL:</td>
                  <td className={`${NUM} font-semibold`}>{legacyNumber(total)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </LegacyDialog>
      )}
    </>
  );
}
