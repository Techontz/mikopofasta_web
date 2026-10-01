"use client";

import Link from "next/link";
import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { confirmAction } from "@/components/ui/notify";
import { money } from "@/lib/format";
import { useAction, useApi } from "@/lib/hooks";

interface PenaltySetting {
  action_penart: "PERCENTAGE VALUE" | "MONEY VALUE";
  penart: number;
}

function PenaltyForm({ setting }: { setting: PenaltySetting }) {
  const [form, setForm] = useState({ action_penart: setting.action_penart as string, penart: String(setting.penart) });
  const update = useAction<typeof form>("put", "settings/penalty");

  return (
    <form onSubmit={(e) => { e.preventDefault(); update.mutate(form); }}>
      <div className="row">
        <div className="col-md-6 col-6">
          <div className="form-group">
            <span>Calculation Type</span>
            <select className="form-control" value={form.action_penart} onChange={(e) => setForm({ ...form, action_penart: e.target.value })}>
              <option value="PERCENTAGE VALUE">Percentage Value</option>
              <option value="MONEY VALUE">Money Value</option>
            </select>
          </div>
        </div>
        <div className="col-md-6 col-6">
          <div className="form-group">
            <span>Penalty Amount</span>
            <input className="form-control" placeholder="Penalty Amount % $" value={form.penart} onChange={(e) => setForm({ ...form, penart: e.target.value })} required autoComplete="off" />
            {update.fieldError("penart") && <div className="field-error">{update.fieldError("penart")}</div>}
          </div>
        </div>
      </div>
      <div className="text-center m-t-20">
        <button type="submit" className="btn btn-primary" disabled={update.isPending}><i className="icon-drawer" />Update</button>
      </div>
    </form>
  );
}

/** Live admin/penart_setting. */
function LoanFreezeForm({ days }: { days: number }) {
  const [value, setValue] = useState(String(days));
  const update = useAction<{ loan_freeze_days: string }>("put", "settings/loan-freeze");

  return (
    <form onSubmit={(e) => { e.preventDefault(); update.mutate({ loan_freeze_days: value }); }}>
      <div className="form-group">
        <span>Default Freeze Time (Days) prefilled when creating a new loan category (0 = no freeze)</span>
        <input type="number" min={0} max={365} step={1} className="form-control" value={value} onChange={(e) => setValue(e.target.value)} required />
        <small className="form-text text-muted">
          The freeze a customer gets is set per loan category in <Link href="/settings/loan-categories">Settings → Loan Categories</Link>. Changing this default does not change existing categories or loans.
        </small>
        {update.fieldError("loan_freeze_days") && <div className="field-error">{update.fieldError("loan_freeze_days")}</div>}
      </div>
      <div className="text-center m-t-20">
        <button type="submit" className="btn btn-primary" disabled={update.isPending}><i className="icon-drawer" />Update</button>
      </div>
    </form>
  );
}

/** Super Admin setting: share of an old-system loan the customer must have repaid before it can be topped up. */
function LegacyTopupForm({ percent, canUpdate }: { percent: number; canUpdate: boolean }) {
  const [value, setValue] = useState(String(percent));
  const update = useAction<{ legacy_topup_percent: string }>("put", "settings/legacy-topup");

  return (
    <form onSubmit={(e) => { e.preventDefault(); update.mutate({ legacy_topup_percent: value }); }}>
      <div className="form-group">
        <span>Percentage of an old-system loan the customer must have paid before a top-up (100 = must clear it first)</span>
        <input type="number" min={1} max={100} step="0.01" className="form-control" value={value} onChange={(e) => setValue(e.target.value)} required disabled={!canUpdate} />
        {!canUpdate && <small className="form-text text-muted">Only the Super Administrator can change this percentage.</small>}
        {update.fieldError("legacy_topup_percent") && <div className="field-error">{update.fieldError("legacy_topup_percent")}</div>}
      </div>
      {canUpdate && (
        <div className="text-center m-t-20">
          <button type="submit" className="btn btn-primary" disabled={update.isPending}><i className="icon-drawer" />Update</button>
        </div>
      )}
    </form>
  );
}

export default function PenaltySettingPage() {
  const { data: freeze } = useApi<{ loan_freeze_days: number }>("settings/loan-freeze");
  const { data: legacyTopup } = useApi<{ legacy_topup_percent: number; can_update: boolean }>("settings/legacy-topup");
  const { data } = useApi<PenaltySetting>("settings/penalty");
  const clear = useAction<PenaltySetting>("put", "settings/penalty");

  return (
    <>
      <PageHeader crumbs={["Penalty Setting"]} />
      <Card title="Penalty Setting">{data ? <PenaltyForm key={`${data.action_penart}-${data.penart}`} setting={data} /> : <Loading />}</Card>
      <Card title="Penalty Setting">
        <div className="table-responsive">
          <table className="table table-hover dataTable table-custom">
            <thead className="thead-info">
              <tr><th>Calculation Type</th><th>Penalty Amount</th><th>Action</th></tr>
            </thead>
            <tbody>
              {data && (
                <tr>
                  <td>{data.action_penart}</td>
                  <td>{data.action_penart === "MONEY VALUE" ? money(data.penart) : `${data.penart}%`}</td>
                  <td>
                    <button type="button" className="btn btn-sm btn-icon btn-danger" onClick={async () => (await confirmAction("Are You Sure?")) && clear.mutate({ action_penart: data.action_penart, penart: 0 })}>
                      <i className="icon-trash" />
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Default Freeze Time for New Loan Categories">{freeze ? <LoanFreezeForm key={freeze.loan_freeze_days} days={freeze.loan_freeze_days} /> : <Loading />}</Card>
      <Card title="Old-System Loan Top-up">{legacyTopup ? <LegacyTopupForm key={legacyTopup.legacy_topup_percent} percent={legacyTopup.legacy_topup_percent} canUpdate={legacyTopup.can_update} /> : <Loading />}</Card>
    </>
  );
}
