import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type {
  CapitalContribution,
  CapitalContributionInput,
  CapitalTotals,
  FloatKind,
  FloatStatus,
  FloatTransfer,
  FloatTransferInput,
  Shareholder,
  ShareholderInput,
} from "@/types/capital";

/**
 * Capital — sidebar → Capital.
 *
 * Reads require `treasury.view`, writes `treasury.manage`; CapitalPolicy
 * decides both. Nothing here re-checks that — the server owns it.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

function toId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

interface ShareholderWire {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  gender: Shareholder["gender"];
  dateOfBirth: string;
  contributionCount?: number;
}

function toShareholder(wire: ShareholderWire): Shareholder {
  return {
    id: wire.id,
    fullName: wire.fullName,
    phone: wire.phone,
    email: wire.email,
    gender: wire.gender,
    dateOfBirth: wire.dateOfBirth,
    contributionCount: wire.contributionCount ?? 0,
  };
}

export async function getShareholders(): Promise<Shareholder[]> {
  const wire = await apiData<ShareholderWire[]>("/api/v1/shareholders", { token: await token() });
  return wire.map(toShareholder);
}

export async function createShareholderRequest(input: ShareholderInput): Promise<Shareholder> {
  return toShareholder(
    await apiData<ShareholderWire>("/api/v1/shareholders", {
      method: "POST",
      token: await token(),
      body: input,
    })
  );
}

export async function updateShareholderRequest(id: string, input: ShareholderInput): Promise<Shareholder> {
  return toShareholder(
    await apiData<ShareholderWire>(`/api/v1/shareholders/${toId(id)}`, {
      method: "PUT",
      token: await token(),
      body: input,
    })
  );
}

export async function deleteShareholderRequest(id: string): Promise<void> {
  await apiData<{ message: string }>(`/api/v1/shareholders/${toId(id)}`, {
    method: "DELETE",
    token: await token(),
  });
}

// ---------------------------------------------------------------------------
// Add Capitals
// ---------------------------------------------------------------------------

function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface ContributionWire {
  id: string;
  shareholderId: string;
  shareholderName?: string;
  amount: string;
  payMethod: CapitalContribution["payMethod"];
  payMethodLabel: string;
  receiptNo: string | null;
  chequeNo: string | null;
  createdAt: string | null;
}

function toContribution(wire: ContributionWire): CapitalContribution {
  return {
    id: wire.id,
    shareholderId: wire.shareholderId,
    shareholderName: wire.shareholderName ?? "—",
    amount: num(wire.amount),
    payMethod: wire.payMethod,
    payMethodLabel: wire.payMethodLabel,
    receiptNo: wire.receiptNo,
    chequeNo: wire.chequeNo,
    createdAt: wire.createdAt,
  };
}

export async function getCapitalContributions(): Promise<{
  contributions: CapitalContribution[];
  totals: CapitalTotals;
}> {
  const response = await apiRequest<ContributionWire[]>("/api/v1/capital-contributions", { token: await token() });
  const meta = response.meta as unknown as { shareholderCapital?: string; companyCapital?: string };

  return {
    contributions: response.data.map(toContribution),
    totals: {
      shareholderCapital: num(meta?.shareholderCapital),
      companyCapital: num(meta?.companyCapital),
    },
  };
}

export async function recordCapitalRequest(input: CapitalContributionInput): Promise<CapitalContribution> {
  return toContribution(
    await apiData<ContributionWire>("/api/v1/capital-contributions", {
      method: "POST",
      token: await token(),
      body: {
        shareholderId: toId(input.shareholderId),
        // A string to the DECIMAL column, as everywhere else money is sent.
        amount: String(input.amount),
        payMethod: input.payMethod,
        receiptNo: input.receiptNo || null,
        chequeNo: input.chequeNo || null,
      },
    })
  );
}

export async function deleteCapitalRequest(id: string): Promise<void> {
  await apiData<{ message: string }>(`/api/v1/capital-contributions/${toId(id)}`, {
    method: "DELETE",
    token: await token(),
  });
}

// ---------------------------------------------------------------------------
// Float
// ---------------------------------------------------------------------------

interface FloatWire {
  id: string;
  kind: FloatTransfer["kind"];
  amount: string;
  status: FloatTransfer["status"];
  statusLabel: string;
  rejectionReason: string | null;
  createdAt: string | null;
  fromBranchName?: string | null;
  toBranchName?: string | null;
  fromAccountName?: string | null;
  toAccountName?: string | null;
  requestedBy: string;
  requesterName?: string | null;
  approverName?: string | null;
}

function toTransfer(wire: FloatWire): FloatTransfer {
  return {
    id: wire.id,
    kind: wire.kind,
    amount: num(wire.amount),
    status: wire.status,
    statusLabel: wire.statusLabel,
    rejectionReason: wire.rejectionReason,
    createdAt: wire.createdAt,
    fromBranchName: wire.fromBranchName ?? null,
    toBranchName: wire.toBranchName ?? null,
    fromAccountName: wire.fromAccountName ?? null,
    toAccountName: wire.toAccountName ?? null,
    requestedBy: wire.requestedBy,
    requesterName: wire.requesterName ?? null,
    approverName: wire.approverName ?? null,
  };
}

export interface FloatFilters {
  kind?: FloatKind;
  status?: FloatStatus;
  from?: string;
  to?: string;
}

export async function getFloatTransfers(
  filters: FloatFilters = {}
): Promise<{ transfers: FloatTransfer[]; total: number }> {
  const response = await apiRequest<FloatWire[]>("/api/v1/float-transfers", {
    token: await token(),
    query: { kind: filters.kind, status: filters.status, from: filters.from, to: filters.to },
  });
  const meta = response.meta as unknown as { total?: string };

  return { transfers: response.data.map(toTransfer), total: num(meta?.total) };
}

export async function requestFloatTransferRequest(input: FloatTransferInput): Promise<FloatTransfer> {
  return toTransfer(
    await apiData<FloatWire>("/api/v1/float-transfers", {
      method: "POST",
      token: await token(),
      body: {
        kind: input.kind,
        amount: String(input.amount),
        fromBranchId: input.fromBranchId ? toId(input.fromBranchId) : null,
        toBranchId: input.toBranchId ? toId(input.toBranchId) : null,
        fromAccountId: input.fromAccountId ? toId(input.fromAccountId) : null,
        toAccountId: input.toAccountId ? toId(input.toAccountId) : null,
      },
    })
  );
}

export async function approveFloatTransferRequest(id: string): Promise<FloatTransfer> {
  return toTransfer(
    await apiData<FloatWire>(`/api/v1/float-transfers/${toId(id)}/approve`, {
      method: "POST",
      token: await token(),
    })
  );
}

export async function rejectFloatTransferRequest(id: string, reason: string): Promise<FloatTransfer> {
  return toTransfer(
    await apiData<FloatWire>(`/api/v1/float-transfers/${toId(id)}/reject`, {
      method: "POST",
      token: await token(),
      body: { reason },
    })
  );
}

export async function deleteFloatTransferRequest(id: string): Promise<void> {
  await apiData<{ message: string }>(`/api/v1/float-transfers/${toId(id)}`, {
    method: "DELETE",
    token: await token(),
  });
}
