import type { Branch, District, Region, Street, Ward } from "@/types/branch";
import type { CustomerCategory } from "@/types/customer";
import type { CustomerListRow } from "@/features/customers/all-customers-panel";
import { LEGACY_BRANCHES, LEGACY_CUSTOMERS } from "@/lib/legacy/source";
import { InferredPlaceholders } from "@/lib/legacy/inferred";
import { MOCK_CUSTOMER_CATEGORIES } from "@/lib/mock-data/customer-categories";
import { REGIONS } from "@/lib/mock-data/regions";

/**
 * The same eighteen, in the shape the All Customer grid draws.
 *
 * Date of birth, age and gender are *invented* here, on instruction, so the
 * design can be judged with those three columns carrying values — the legacy
 * All Customer screen was captured with no rows in it, so nothing about them is
 * evidence. Ages walk 22 to 47 and gender alternates, which is a spread rather
 * than a distribution anyone should read anything into.
 *
 * The fixture is only ever reachable with the design-data banner above it, and
 * the customer number keeps a visible `CUS-` prefix, so nothing here can be
 * mistaken for the business's real book.
 */
const FIXTURE_YEAR = 2026;

export const DESIGN_ALL_CUSTOMER_ROWS: CustomerListRow[] = LEGACY_CUSTOMERS.map(
  (customer, index) => {
    const age = 22 + ((index * 3) % 26);
    const month = String((index % 12) + 1).padStart(2, "0");
    const day = String((index % 27) + 1).padStart(2, "0");

    return {
      id: `design-${index + 1}`,
      customerId: `CUS-${1001 + index}`,
      name: customer.name,
      dob: `${FIXTURE_YEAR - age}-${month}-${day}`,
      age,
      gender: index % 2 === 0 ? "Male" : "Female",
      phone: customer.phone,
      branch: customer.branch,
      // NEW in the legacy vocabulary means "on the book, no history yet".
      status: "active",
      createdAt: InferredPlaceholders.PLACEHOLDER_TIMESTAMP,
    };
  }
);

/**
 * The six lookups the registration wizard needs before it can render a single
 * dropdown.
 *
 * Branch names are the three legacy ones. The address chain below them is
 * inferred — the legacy registration form takes District, Ward and Street as
 * free text, so there is no legacy lookup to copy and our four-level cascade is
 * an addition of ours. It is populated anyway, because a cascade whose first
 * select has nothing under it cannot be assessed as a design.
 */
const DESIGN_BRANCHES: Branch[] = LEGACY_BRANCHES.map((name, i) => ({
  id: `design-branch-${i + 1}`,
  name,
  regionId: null,
  zoneId: null,
  phone: InferredPlaceholders.NO_PHONE_CAPTURED,
  type: "main",
  parentBranchId: null,
  isHeadOffice: false,
  status: "active",
  createdBy: null,
  deletedAt: null,
}));

/*
 * One district, ward and street per region, so every level of the cascade has
 * something to reveal when the level above it is picked. Named for what they
 * are rather than dressed up as real places — an invented ward name in a
 * Tanzanian microfinance system would be indistinguishable from a real one.
 */
const DESIGN_DISTRICTS: District[] = REGIONS.map((region) => ({
  id: `design-district-${region.id}`,
  regionId: region.id,
  name: `${region.name} District`,
}));

const DESIGN_WARDS: Ward[] = DESIGN_DISTRICTS.map((district) => ({
  id: `design-ward-${district.id}`,
  districtId: district.id,
  name: `${district.name} Ward`,
}));

const DESIGN_STREETS: Street[] = DESIGN_WARDS.map((ward) => ({
  id: `design-street-${ward.id}`,
  wardId: ward.id,
  name: `${ward.name} Street`,
}));

/**
 * Tuple order matches the `Promise.all` in the Register Customer page exactly.
 * Getting it wrong would silently hand regions to the categories dropdown, so
 * the type annotation is what holds the two in step.
 */
export const DESIGN_REGISTRATION_LOOKUPS: [
  Branch[],
  CustomerCategory[],
  Region[],
  District[],
  Ward[],
  Street[],
] = [DESIGN_BRANCHES, MOCK_CUSTOMER_CATEGORIES, REGIONS, DESIGN_DISTRICTS, DESIGN_WARDS, DESIGN_STREETS];
