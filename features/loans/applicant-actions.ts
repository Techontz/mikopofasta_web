"use server";

import { revalidatePath } from "next/cache";
import {
  createGuarantorRequest,
  getCustomers,
  getGuarantors,
  searchGuarantorsRequest,
  type CustomerListItem,
} from "@/lib/api/customers";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";
import type { Guarantor, ImportableGuarantor } from "@/types/guarantor";

/**
 * The loan application's two type-ahead lookups, and the guarantor writes that
 * go with them.
 *
 * Everything here is a thin pass-through to an endpoint. There is deliberately
 * no filtering, sorting or rule-checking in this file: the API decides who is
 * loan-eligible and which records this officer may see, and a second opinion
 * formed here could only ever disagree with the one the loan gate will apply.
 */

/* ------------------------------------------------------------- customers */

export interface ApplicantSearchResult {
  ok: boolean;
  customers: CustomerListItem[];
  /** Total the API reports for the query, which may exceed what was returned. */
  total: number;
  message?: string;
}

/**
 * Loan-eligible customers matching `search`.
 *
 * `loan_eligible=1` is the whole rule, evaluated server-side by
 * `Customer::scopeLoanEligible()` — the same definition `isLoanEligible()` uses
 * and therefore the same one `POST /loans` enforces. Registration approval,
 * KYC, the face scan and the account's standing are all inside it. Nothing in
 * this codebase re-derives any of that in the browser, and nothing should: a
 * selector that offered somebody the loan gate would refuse is a selector that
 * sends an officer down a dead end.
 *
 * Searching is the API's too — `?search=` runs `Customer::scopeSearch`, which
 * covers the customer number, both phone columns and the assembled full name.
 * That is why this asks the server on every keystroke instead of downloading
 * the branch's whole book and filtering it here.
 */
export async function searchEligibleApplicants(
  search: string,
  perPage = 25
): Promise<ApplicantSearchResult> {
  try {
    const { customers, pagination } = await getCustomers({
      loanEligible: true,
      search: search.trim() || undefined,
      perPage,
      page: 1,
    });

    return { ok: true, customers, total: pagination?.total ?? customers.length };
  } catch (error) {
    /* Reported, not swallowed into an empty list. "No eligible customers" and
       "the lookup failed" demand different things of the officer, and showing
       the first when the second happened is how a broken API looks like an
       empty branch. */
    return { ok: false, customers: [], total: 0, message: describeError(error) };
  }
}

/**
 * How many finished registrations are waiting on a manager.
 *
 * Only ever used to explain an empty selector, and only ever from the API's own
 * count — the number is never inferred or estimated. Fails soft to null, which
 * the UI renders as no message at all rather than as zero.
 */
export async function countAwaitingApproval(): Promise<number | null> {
  try {
    const { pagination, customers } = await getCustomers({
      kycStatus: ["completed"],
      approvalStatus: ["pending"],
      perPage: 1,
      page: 1,
    });

    return pagination?.total ?? customers.length;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------ guarantors */

export interface GuarantorListResult {
  ok: boolean;
  guarantors: Guarantor[];
  message?: string;
}

/** The guarantors already on this customer — the table under the two forms. */
export async function listCustomerGuarantors(customerId: string): Promise<GuarantorListResult> {
  if (!customerId) return { ok: true, guarantors: [] };

  try {
    return { ok: true, guarantors: await getGuarantors(customerId) };
  } catch (error) {
    return { ok: false, guarantors: [], message: describeError(error) };
  }
}

export interface ImportSearchResult {
  ok: boolean;
  guarantors: ImportableGuarantor[];
  message?: string;
}

/**
 * Existing guarantors to import, from anywhere in this officer's branch scope.
 *
 * The record is not shared — see `importGuarantor` — but finding it is what
 * saves the branch re-typing a name, a phone and an ID number that are already
 * on file, and re-typing is how one person ends up on the book three times
 * under three spellings.
 */
export async function searchImportableGuarantors(search: string): Promise<ImportSearchResult> {
  try {
    return { ok: true, guarantors: await searchGuarantorsRequest(search) };
  } catch (error) {
    return { ok: false, guarantors: [], message: describeError(error) };
  }
}

/**
 * Copies an existing guarantor onto this customer.
 *
 * A COPY, not a shared row. `guarantors.customer_id` is the owning key, so one
 * row cannot belong to two customers — and if it could, removing the guarantor
 * from one file would silently remove them from the other. The relationship is
 * taken fresh because it is a fact about THIS pairing: the same person may be a
 * borrower's sibling and their neighbour's friend.
 *
 * It goes through the ordinary `POST /customers/{id}/guarantors`, so the import
 * path is validated by exactly the same rules as a typed-in guarantor.
 */
export async function importGuarantor(
  customerId: string,
  source: ImportableGuarantor,
  relationship: string
): Promise<ActionResult> {
  if (!customerId) return { ok: false, message: "Select a customer first." };

  try {
    await createGuarantorRequest(customerId, {
      name: source.name,
      phone: source.phone,
      nidaNumber: source.nidaNumber,
      gender: source.gender ?? null,
      maritalStatus: source.maritalStatus ?? null,
      relationship,
      address: source.address,
      occupation: source.occupation,
      /*
       * The passport travels too, copied on the server's private disk. The
       * browser holds no file to re-upload, and sending a regulated document
       * on a round trip through a client to get it back byte-for-byte would be
       * absurd. The API branch-checks the source before copying anything.
       */
      copyPassportFromGuarantorId: source.passportUrl ? source.id : null,
    });
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: `${source.name} imported as a guarantor.` };
}
