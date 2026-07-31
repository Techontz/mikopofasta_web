import "server-only";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type {
  LoanFee,
  LoanFeeInput,
  LoanFeeRow,
  PenaltySetting,
  PenaltySettingInput,
  ReserveSetting,
  ReserveSettingInput,
} from "@/types/loan-charge";

/**
 * Loan Charges & Reserve — Settings → Loan Fee / Penalty / Reserve Setting.
 *
 * Reads are open to any authenticated caller; every write is gated on
 * `admin.org_settings` by the API's LoanChargePolicy. Nothing here re-checks
 * that: the server decides, and duplicating the rule here would only create a
 * second place for it to drift.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

/** Request bodies take integers; the wire hands ids back as strings. */
function toId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Money and rates arrive as decimal strings so a float never touches them. */
function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface LoanFeeWire {
  id: string;
  loanProductId: string;
  feeType: LoanFee["feeType"];
  feeTypeLabel: string;
  feeAmount: string;
  insuranceAmount: string;
}

interface LoanFeeRowWire {
  loanProductId: string;
  productName: string;
  productCode: string;
  minAmount: string;
  maxAmount: string;
  interestRate: string;
  fee: LoanFeeWire | null;
}

function toFee(wire: LoanFeeWire): LoanFee {
  return {
    id: wire.id,
    loanProductId: wire.loanProductId,
    feeType: wire.feeType,
    feeTypeLabel: wire.feeTypeLabel,
    feeAmount: num(wire.feeAmount),
    insuranceAmount: num(wire.insuranceAmount),
  };
}

/**
 * Every loan category with its fee where one is set.
 *
 * The API returns unpriced categories with a null fee rather than omitting
 * them, so the screen can list the whole book without a second call.
 */
export async function getLoanFees(): Promise<LoanFeeRow[]> {
  const wire = await apiData<LoanFeeRowWire[]>("/api/v1/loan-fees", { token: await token() });

  return wire.map((row) => ({
    loanProductId: row.loanProductId,
    productName: row.productName,
    productCode: row.productCode,
    minAmount: num(row.minAmount),
    maxAmount: num(row.maxAmount),
    interestRate: num(row.interestRate),
    fee: row.fee === null ? null : toFee(row.fee),
  }));
}

export async function upsertLoanFeeRequest(loanProductId: string, input: LoanFeeInput): Promise<LoanFee> {
  const wire = await apiData<LoanFeeWire>(`/api/v1/loan-fees/${toId(loanProductId)}`, {
    method: "PUT",
    token: await token(),
    body: {
      feeType: input.feeType,
      // Sent as strings: the column is a DECIMAL, and a fee should not round
      // trip through a float on its way there.
      feeAmount: String(input.feeAmount),
      insuranceAmount: String(input.insuranceAmount),
    },
  });

  return toFee(wire);
}

export async function deleteLoanFeeRequest(loanProductId: string): Promise<void> {
  await apiData<{ message: string }>(`/api/v1/loan-fees/${toId(loanProductId)}`, {
    method: "DELETE",
    token: await token(),
  });
}

// ---------------------------------------------------------------------------
// Penalty
// ---------------------------------------------------------------------------

interface PenaltySettingWire {
  id: string;
  calculationType: PenaltySetting["calculationType"];
  calculationTypeLabel: string;
  amount: string;
  createdAt: string | null;
}

function toPenaltySetting(wire: PenaltySettingWire): PenaltySetting {
  return {
    id: wire.id,
    calculationType: wire.calculationType,
    calculationTypeLabel: wire.calculationTypeLabel,
    amount: num(wire.amount),
    createdAt: wire.createdAt,
  };
}

/** The recorded penalty defaults, newest first — the API orders them. */
export async function getPenaltySettings(): Promise<PenaltySetting[]> {
  const wire = await apiData<PenaltySettingWire[]>("/api/v1/penalty-settings", { token: await token() });
  return wire.map(toPenaltySetting);
}

export async function createPenaltySettingRequest(input: PenaltySettingInput): Promise<PenaltySetting> {
  const wire = await apiData<PenaltySettingWire>("/api/v1/penalty-settings", {
    method: "POST",
    token: await token(),
    body: {
      calculationType: input.calculationType,
      // A string for the same reason the fee is: the column is a DECIMAL.
      amount: String(input.amount),
    },
  });

  return toPenaltySetting(wire);
}

export async function deletePenaltySettingRequest(id: string): Promise<void> {
  await apiData<{ message: string }>(`/api/v1/penalty-settings/${toId(id)}`, {
    method: "DELETE",
    token: await token(),
  });
}

// ---------------------------------------------------------------------------
// Reserve
// ---------------------------------------------------------------------------

interface ReserveSettingWire {
  id: string;
  percentage: string;
  updatedAt: string | null;
}

function toReserveSetting(wire: ReserveSettingWire): ReserveSetting {
  return {
    id: wire.id,
    percentage: num(wire.percentage),
    updatedAt: wire.updatedAt,
  };
}

/**
 * The reserve percentage. Always resolves: the API creates the singleton row on
 * first read, so this screen never has to render an absent value.
 */
export async function getReserveSetting(): Promise<ReserveSetting> {
  const wire = await apiData<ReserveSettingWire>("/api/v1/reserve-setting", { token: await token() });
  return toReserveSetting(wire);
}

export async function updateReserveSettingRequest(input: ReserveSettingInput): Promise<ReserveSetting> {
  const wire = await apiData<ReserveSettingWire>("/api/v1/reserve-setting", {
    method: "PUT",
    token: await token(),
    // A string for the same reason the fee and penalty are: the column is a
    // DECIMAL, and a rate should not round trip through a float.
    body: { percentage: String(input.percentage) },
  });

  return toReserveSetting(wire);
}
