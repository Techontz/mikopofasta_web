import { Badge } from "@/components/ui/Badge";
import { money } from "@/lib/format";

/** A customer's debts (API CustomerDebt): loan principal, penalty and salary advance, never folded into one another. */
export interface CustomerDebt {
  principal: number;
  interest: number;
  loan_total: number;
  penalty: number;
  penalty_without_loan: number;
  salary_advance: number;
  total: number;
  has_old_system_debt: boolean;
  old_system: { principal: number; penalty: number; salary_advance: number; total: number };
  loans: { id: number; loan_number: string; reference_number: string | null; status: string; is_legacy_opening: boolean; principal: number; interest: number; penalty: number; total: number }[];
  salary_advances: { id: number; is_legacy_opening: boolean; amount: number; total_payable: number; paid: number; remaining: number }[];
}

/**
 * Customer debt profile: Principal / Penalty / Active Salary Advance / Total Outstanding, with the part carried over from
 * the old system. Shown on the teller, Record Confirmed Payment, loan application and customer pages so nobody types
 * an existing balance by hand, and nobody looks debt-free because the debt was imported.
 */
export function DebtSummary({ debt, title = "Customer Debt Profile", note }: { debt: CustomerDebt | null | undefined; title?: string; note?: string }) {
  if (!debt) {
    return null;
  }

  return (
    <div className="mb-3">
      <h6 className="mb-2">
        {title} {debt.has_old_system_debt && <Badge tone="dark">INCLUDES OLD SYSTEM DEBT</Badge>}
      </h6>
      <div className="table-responsive">
        <table className="table table-sm table-bordered mb-1">
          <thead className="thead-info">
            <tr>
              <th>Principal Outstanding</th>
              {debt.interest > 0 && <th>Interest Outstanding</th>}
              <th>Penalty Outstanding</th>
              <th>Active Salary Advance</th>
              <th>Total Outstanding</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{money(debt.principal)}</td>
              {debt.interest > 0 && <td>{money(debt.interest)}</td>}
              <td>{money(debt.penalty)}</td>
              <td>{money(debt.salary_advance)}</td>
              <td><b>{money(debt.total)}</b></td>
            </tr>
            {debt.has_old_system_debt && (
              <tr className="small text-muted">
                <td>old system: {money(debt.old_system.principal)}</td>
                {debt.interest > 0 && <td />}
                <td>old system: {money(debt.old_system.penalty)}</td>
                <td>old system: {money(debt.old_system.salary_advance)}</td>
                <td>old system: {money(debt.old_system.total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <small className="text-muted">
        Three separate debts. A loan payment covers principal and penalty (Principal → Penalty → Interest); the salary advance is paid on its own, from Salary Advance.
        {debt.penalty_without_loan > 0 && ` ${money(debt.penalty_without_loan)} of penalty stands on no loan and is paid from Penalty → Penalty List.`}
        {note && ` ${note}`}
      </small>
    </div>
  );
}
