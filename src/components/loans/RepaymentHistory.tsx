"use client";

import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { money } from "@/lib/format";
import { useApi } from "@/lib/hooks";

interface RepaymentRow {
  number: number;
  deduction_date: string;
  collection_date: string | null;
  instalment_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: "paid" | "partial" | "unpaid";
  is_due: boolean;
}

interface RepaymentHistoryData {
  loan: { id: number; loan_number: string; reference_number: string | null; product: string | null; customer: string | null; status: string | null; start_date: string | null; withdrawn_at: string | null; end_date: string | null; instalment: number; loan_method: string | null };
  rows: RepaymentRow[];
  totals: { instalments: number; paid: number; outstanding: number };
}

const STATUS: Record<RepaymentRow["status"], { label: string; badge: string }> = {
  paid: { label: "Paid", badge: "success" },
  partial: { label: "Partial Paid", badge: "warning" },
  unpaid: { label: "Unpaid", badge: "danger" },
};

/**
 * Loan Repayment History popup: the selected loan's existing schedule, instalment by instalment, with the confirmed amount
 * paid on each, its collection date and what is still outstanding. Used by Customer Profile and eSIMU → Devices, from the
 * same API (loans/{id}/repayment-history), so both show identical figures.
 */
export function RepaymentHistoryModal({ loanId, onClose }: { loanId: number | null; onClose: () => void }) {
  const { data, isLoading, error } = useApi<RepaymentHistoryData>(loanId ? `loans/${loanId}/repayment-history` : null);

  return (
    <Modal open={loanId !== null} onClose={onClose} size="lg" title={data ? `Loan Repayment History - ${data.loan.loan_number}` : "Loan Repayment History"}>
      {isLoading && <p>Loading...</p>}
      {error && <p className="text-danger">Could not load the repayment history: {error.message}</p>}
      {data && (
        <>
          <div className="row small mb-2">
            <div className="col-md-4"><span className="text-muted">Customer:</span> {data.loan.customer ?? "-"}</div>
            <div className="col-md-4"><span className="text-muted">Product:</span> {data.loan.product ?? "-"}{data.loan.loan_method ? ` · ${data.loan.loan_method}` : ""}</div>
            <div className="col-md-4"><span className="text-muted">Status:</span> {data.loan.status ?? "-"}</div>
            <div className="col-md-4"><span className="text-muted">Start Date:</span> {data.loan.start_date ?? "-"}</div>
            <div className="col-md-4"><span className="text-muted">Withdrawal Date:</span> {data.loan.withdrawn_at ?? "-"}</div>
            <div className="col-md-4"><span className="text-muted">End Date:</span> {data.loan.end_date ?? "-"}</div>
          </div>
          {data.rows.length === 0 ? (
            <p className="text-muted mb-0">This loan has no repayment schedule yet (the schedule is created when the loan is disbursed).</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-custom mf-table mb-0">
                <thead className="thead-info">
                  <tr>
                    <th>#</th>
                    <th>Deduction Date</th>
                    <th>Collection Date</th>
                    <th className="text-right">Installment Amt</th>
                    <th className="text-right">Paid Amt</th>
                    <th className="text-right">Outstanding Amt</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.number}>
                      <td>{row.number}</td>
                      <td className="text-nowrap">{row.deduction_date}</td>
                      <td className="text-nowrap">{row.collection_date ?? "-"}</td>
                      <td className="text-right">{money(row.instalment_amount)}</td>
                      <td className="text-right">{money(row.paid_amount)}</td>
                      <td className="text-right">{money(row.outstanding_amount)}</td>
                      <td>
                        <span className={`badge badge-${STATUS[row.status].badge}`}>{STATUS[row.status].label.toUpperCase()}</span>
                        {row.status !== "paid" && !row.is_due && <small className="d-block text-muted">not yet due</small>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={3}>TOTAL</th>
                    <th className="text-right">{money(data.totals.instalments)}</th>
                    <th className="text-right">{money(data.totals.paid)}</th>
                    <th className="text-right">{money(data.totals.outstanding)}</th>
                    <th />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <small className="text-muted d-block mt-2">Only confirmed repayments are counted. Penalties are charged separately and are not part of the installment amounts.</small>
        </>
      )}
    </Modal>
  );
}

/** Eye button that opens the Loan Repayment History of one loan. */
export function RepaymentHistoryButton({ loanId, label }: { loanId: number; label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn btn-sm btn-icon btn-outline-primary" title="Loan Repayment History" aria-label={label ?? "Loan Repayment History"} onClick={() => setOpen(true)}>
        <i className="icon-eye" />
      </button>
      {open && <RepaymentHistoryModal loanId={loanId} onClose={() => setOpen(false)} />}
    </>
  );
}
