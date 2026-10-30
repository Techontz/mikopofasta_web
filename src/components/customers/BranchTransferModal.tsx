"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { toastError, toastSuccess } from "@/components/customers/toast";
import type { Customer } from "@/components/customers/types";
import { Modal } from "@/components/ui/Modal";
import { SelectBox } from "@/components/ui/SelectBox";
import { api, ApiError } from "@/lib/api";

/**
 * Request moving a customer to another branch (customers.transfer). Nothing moves until another user approves it; then the
 * customer, their open loans, unpaid penalties and savings move, while payments already received stay with this branch.
 */
export function BranchTransferModal({ customer, open, onClose }: { customer: Customer; open: boolean; onClose: () => void }) {
  const client = useQueryClient();
  const [toBranchId, setToBranchId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!toBranchId || !reason.trim()) {
      toastError("Choose the new branch and enter the reason.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`customers/${customer.id}/branch-transfers`, { to_branch_id: Number(toBranchId), reason });
      await client.invalidateQueries();
      toastSuccess("Transfer requested. It takes effect once approved.");
      setToBranchId("");
      setReason("");
      onClose();
    } catch (error) {
      toastError(error instanceof ApiError ? error.firstError : "The transfer could not be requested.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Transfer ${customer.fullName}`} submitLabel="Request transfer" onSubmit={() => void submit()} submitting={submitting}>
      <div className="form-group">
        <label>From branch</label>
        <input className="form-control" value={customer.branchName ?? ""} readOnly />
      </div>
      <div className="form-group">
        <label htmlFor="transfer-branch">To branch</label>
        <SelectBox inputId="transfer-branch" optionsUrl="options/branches" query={{ transfer_targets: 1, branches_only: 1 }} value={toBranchId} onChange={(value) => setToBranchId(value ?? "")} />
      </div>
      <div className="form-group">
        <label htmlFor="transfer-reason">Reason</label>
        <textarea id="transfer-reason" className="form-control" rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} required />
      </div>
      <small className="text-muted">Open loans, repayment schedules, unpaid penalties and savings move to the new branch. Payments already received stay recorded at {customer.branchName}.</small>
    </Modal>
  );
}
