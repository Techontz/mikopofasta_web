"use client";

import { Modal } from "@/components/ui/Modal";
import { money } from "@/lib/format";

export interface BranchAccounts {
  month: string;
  rows: Array<Record<string, number | string>>;
  total: Record<string, number>;
}

/** Branch List money columns, in display order. */
const BRANCH_COLUMNS = ["petty_cash", "principal_repaid", "interest", "loan_fee", "penalty", "reserve", "salary_advance", "cash_pending"];

/** "Branch List" popup of the dashboards: one row per branch, every figure from the API's branch_accounts. */
export function BranchListModal({ open, onClose, data }: { open: boolean; onClose: () => void; data: BranchAccounts | null }) {
  return (
    <Modal open={open} onClose={onClose} title={`Branch List — ${data?.month ?? ""}`} size="xl">
      <div className="table-responsive">
        <table className="table table-bordered">
          <thead className="thead-info">
            <tr>
              <th>Branch Name</th>
              <th>Petty Cash<small className="d-block">available now</small></th>
              <th>Principal Repaid</th>
              <th>Interest</th>
              <th>Loan fee</th>
              <th>Penalty</th>
              <th>Reserve</th>
              <th>Salary Advance</th>
              <th>Cash Pending<small className="d-block">not yet verified</small></th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((branch) => (
              <tr key={String(branch.name)}>
                <td>{branch.name}</td>
                {BRANCH_COLUMNS.map((key) => <td key={key}>{money(branch[key] as number)}</td>)}
              </tr>
            ))}
            {data && (
              <tr>
                <th>TOTAL:</th>
                {BRANCH_COLUMNS.map((key) => <th key={key}>{money(data.total[key])}</th>)}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <small className="text-muted">
        Every column covers {data?.month} except Petty Cash, which is the balance each branch holds now — the only money a branch holds. Principal Repaid is already back in HQ&apos;s Operation Principal, and Interest (after the 20% reserve), Loan fee, Penalty and Reserve are what the branch collected for HQ. Salary Advance is the full amount customers repaid on salary advances this month (capital + profit), shown as a report only — the capital is already back in Operation Principal and the profit in Salary Advance income. Cash Pending is teller cash collected this month that Finance has not yet verified as banked.
      </small>
    </Modal>
  );
}
