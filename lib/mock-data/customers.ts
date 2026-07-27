import type { Customer } from "@/types/customer";
import { needsApproval } from "@/types/customer";
import { MARITAL_STATUSES } from "@/types/enums";
import { customerNumber } from "@/lib/domain/id-generators";
import { createRng, dateOnlyDaysAgo, intBetween, pick } from "@/lib/domain/rng";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { MOCK_CUSTOMER_CATEGORIES } from "@/lib/mock-data/customer-categories";

const FIRST_NAMES_M = ["Juma", "Hassan", "Mussa", "Salum", "Ally", "Rashid", "Omari", "Iddi", "Selemani", "Athumani", "Baraka", "Emmanuel"];
const FIRST_NAMES_F = ["Fatuma", "Zainabu", "Halima", "Mariam", "Neema", "Rehema", "Salma", "Amina", "Consolata", "Devota", "Grace", "Happiness"];
const LAST_NAMES = ["Mwakalinga", "Kimaro", "Mushi", "Kessy", "Mollel", "Urio", "Mbwana", "Komba", "Mrema", "Massawe", "Juma", "Ngowi", "Chacha", "Mwakasege", "Lyimo"];

const REGION_BY_BRANCH: Record<string, string> = Object.fromEntries(MOCK_BRANCHES.map((b) => [b.id, b.regionId ?? ""]));

function generateCustomers(count: number): Customer[] {
  const rng = createRng(20260701);
  const customers: Customer[] = [];

  for (let i = 1; i <= count; i++) {
    const branch = MOCK_BRANCHES.filter((b) => !b.isHeadOffice)[i % (MOCK_BRANCHES.length - 1)];
    const category = pick(rng, MOCK_CUSTOMER_CATEGORIES);
    const gender = rng() > 0.5 ? "male" : "female";
    const firstName = pick(rng, gender === "male" ? FIRST_NAMES_M : FIRST_NAMES_F);
    const lastName = pick(rng, LAST_NAMES);
    const kycComplete = rng() > 0.15; // ~85% fully onboarded, a handful mid-KYC
    const isFrozen = i === count; // exactly one frozen customer for the freeze-flow story
    const isSuspended = i === count - 1;

    const dynamicFormData: Record<string, string | number> = {};
    for (const field of category.dynamicFormSchema) {
      if (field.type === "number") dynamicFormData[field.key] = intBetween(rng, 5_000, 80_000) * 10;
      else if (field.type === "date") dynamicFormData[field.key] = dateOnlyDaysAgo(intBetween(rng, 200, 2000));
      else dynamicFormData[field.key] = `${field.label} sample value`;
    }

    customers.push({
      id: `cust-${i}`,
      customerNumber: customerNumber(i),
      nidaNumber: `19${intBetween(rng, 60, 99)}${String(intBetween(rng, 1, 12)).padStart(2, "0")}${String(intBetween(rng, 1, 28)).padStart(2, "0")}-${intBetween(rng, 10000, 99999)}-${intBetween(rng, 10000, 99999)}-${intBetween(rng, 10, 99)}`,
      firstName,
      middleName: rng() > 0.5 ? pick(rng, gender === "male" ? FIRST_NAMES_M : FIRST_NAMES_F) : null,
      lastName,
      dob: dateOnlyDaysAgo(intBetween(rng, 18 * 365, 55 * 365)),
      gender,
      phone: `07${intBetween(rng, 50, 69)}${String(intBetween(rng, 100000, 999999)).padStart(6, "0")}`,
      photoPath: null,
      nidaVerifiedAt: kycComplete ? dateOnlyDaysAgo(intBetween(rng, 30, 400)) : null,
      otpVerifiedAt: kycComplete ? dateOnlyDaysAgo(intBetween(rng, 30, 400)) : null,
      faceVerifiedAt: kycComplete ? dateOnlyDaysAgo(intBetween(rng, 30, 400)) : null,
      maritalStatus: kycComplete ? pick(rng, MARITAL_STATUSES) : null,
      regionId: REGION_BY_BRANCH[branch.id] ?? null,
      districtId: null,
      wardId: null,
      streetId: null,
      residenceType: kycComplete ? (rng() > 0.5 ? "owned" : "rented") : null,
      customerCategoryId: category.id,
      dynamicFormData: kycComplete ? dynamicFormData : null,
      branchId: branch.id,
      kycStatus: kycComplete ? "completed" : "incomplete",
      status: isFrozen ? "frozen" : isSuspended ? "suspended" : "active",
      approvalStatus:
        kycComplete && needsApproval(category) ? (i % 7 === 0 ? "pending" : i % 11 === 0 ? "rejected" : "approved") : "not_required",
      approvedBy: kycComplete && needsApproval(category) && i % 7 !== 0 ? "u-branch-manager" : null,
      approvedAt: kycComplete && needsApproval(category) && i % 7 !== 0 ? dateOnlyDaysAgo(intBetween(rng, 10, 350)) : null,
      rejectionReason: kycComplete && needsApproval(category) && i % 11 === 0 ? "Insufficient collateral evidence" : null,
      createdBy: null,
      createdAt: dateOnlyDaysAgo(intBetween(rng, 30, 500)),
      deletedAt: null,
    });
  }
  return customers;
}

export const MOCK_CUSTOMERS: Customer[] = generateCustomers(24);
