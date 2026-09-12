import { structuredNameFor, type StructuredTarget } from "@/features/customers/registration-wizard/structured-fields";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";
import type { CustomerCategory, DynamicFormField } from "@/types/customer";

/**
 * What step two asks, for the customer type chosen on step one.
 *
 * TWO SOURCES, ONE LIST, AND THE CONFIGURATION ALWAYS WINS.
 *
 *   1. The customer type's own configured registration form — whatever an
 *      administrator declared, in their order. This is the real answer and is
 *      never altered, reordered or second-guessed.
 *
 *   2. The standard block for what KIND of customer this is — the employment
 *      questions for an employed customer, the business questions for a trader
 *      — minus anything (1) already asks.
 *
 * WHY (2) EXISTS. A customer type with no configured form used to render an
 * empty card reading "No additional details have been configured for this
 * customer type yet", and that was the whole of step two: the officer could
 * register a salaried customer without ever being offered a box for their
 * employer, their salary or their check number, while `requiresEmploymentDetails`
 * on the account type refused the save for the want of exactly those — attaching
 * the message to fields no step drew. A form that cannot satisfy its own rules
 * is worse than one with a section nobody uses.
 *
 * NOTHING HERE NAMES A CUSTOMER TYPE. The selection is made from `sector`
 * ("employment" | "business" | "other"), from the four `requires*` booleans the
 * administration screen sets on the type, and from the account type's own
 * profile — all of them data. There is no `if (code === "WATUMISHI")` and there
 * must never be one: a customer type created this afternoon gets the right
 * block this afternoon.
 *
 * EVERY STANDARD FIELD IS OPTIONAL, deliberately. What is MANDATORY is the
 * account type's judgement and the API's — `requiresEmploymentDetails` wants an
 * employer OR a place of employment and any ONE income figure, which is a rule
 * about the group rather than about a box (see `validateStepAgainstProfile`).
 * Marking each field required here would demand all four and disagree with the
 * server about what completeness means.
 *
 * THE SHAPE IS `DynamicFormField`, which is not a coincidence: these are fed to
 * exactly the same renderer and the same validator as a configured field, so a
 * standard field gets the parented dropdown, the conditional requirement and
 * the structured storage for free, and there is one code path rather than two.
 */

/**
 * The targets STEP ONE already puts on screen.
 *
 * A customer type may perfectly reasonably configure a "Number of dependents"
 * question — several do — and before step one asked for them that was the only
 * place they were collected. Now that step one has the box, rendering the
 * configured copy as well would put two controls on two steps behind one
 * column, and whichever the officer filled in second would win.
 *
 * They are filtered out of what is RENDERED on step two and stay in what is
 * VALIDATED: a type that marks such a question required still requires an
 * answer, and the message lands on step one, where the box is.
 *
 * MEMBERSHIP FOLLOWS THE BOX. `nickname` was in this set until step one stopped
 * drawing a Nickname field; left here it would have suppressed the configured
 * question on step two while no step drew one, so a type requiring a nickname
 * could never be satisfied — required, invisible, and unanswerable. A target
 * belongs here only for as long as step one actually shows a control for it.
 */
export const BASIC_STEP_TARGETS: ReadonlySet<StructuredTarget> = new Set<StructuredTarget>([
  "dependentsCount",
  "alternativePhone",
  "email",
  "nationality",
  "maritalStatusId",
  "residenceType",
]);

/**
 * The payment targets, which step two collects through the MNO/Bank chooser
 * rather than as ordinary fields.
 *
 * A configured "Bank" dropdown and the chooser's own would be two controls
 * writing one column, and the chooser is the one that knows to clear the wallet
 * when a bank is picked.
 */
export const PAYMENT_TARGETS: ReadonlySet<StructuredTarget> = new Set<StructuredTarget>([
  "bankId",
  "bankBranch",
  "mobileMoneyProviderId",
  "walletNumber",
]);

/** Convenience for the composers below — every standard field is optional. */
function field(
  key: string,
  label: string,
  type: DynamicFormField["type"],
  storesIn: StructuredTarget,
  extra: Partial<DynamicFormField> = {}
): DynamicFormField {
  return { key, label, type, required: false, storesIn, ...extra };
}

/**
 * Where somebody works, on what terms, and what they are paid.
 *
 * The optional halves are the category's own booleans, which exist precisely so
 * that this does not have to be guessed: a public servant serves in a SECTOR
 * and holds a CADRE inside it; a private employee names a COMPANY from a
 * different list; a contract customer has a contract type, and a temporary one
 * has an expiry the API insists on.
 */
function employmentFields(category: CustomerCategory | undefined): DynamicFormField[] {
  /*
   * WHAT IS NO LONGER ASKED HERE, and why.
   *
   * Type of Employment, Work Type, Employer, Occupation, Department and
   * Council Number were dropped because every customer type now configures the
   * same facts in its own words, and asking both put two differently-worded
   * boxes for one answer on the same screen: "Idara" above "Department",
   * "Cheo" above "Occupation", "Aina ya Ajira" above "Type of Employment".
   * The officer had no way to tell which the institution actually reads.
   *
   * They remain real columns and are still editable from the customer's
   * profile — this removes the duplicate QUESTION, not the data.
   */
  const rows: DynamicFormField[] = [];

  if (category?.requiresSector) {
    rows.push(
      field("sector_id", "Sector", "select", "sectorId", { dataSource: "sectors" }),
      /* The cadre belongs to the sector above it, so it is fetched for that
         sector and cleared when it changes — the renderer does both off these
         two properties. */
      field("sector_category_id", "Cadre", "select", "sectorCategoryId", {
        dataSource: "sector-categories",
        dependsOn: "sector_id",
      })
    );
  }

  /* The employing body stays ONLY where the account type explicitly asks for
     it from the admin-managed list; the free-text copy was one of the
     duplicates above. */
  if (category?.requiresEmployer) {
    rows.push(field("employer_id", "Employer", "select", "employerId", { dataSource: "employers" }));
  }

  rows.push(
    field("place_of_employment", "Place of Employment", "text", "placeOfEmployment"),
    field("check_number", "Check Number", "text", "checkNumber", {
      helpText: "The payroll check number, where the employer issues one.",
    })
  );

  if (category?.requiresContract) {
    rows.push(
      field("contract_type_id", "Contract Type", "select", "contractTypeId", {
        dataSource: "contract-types",
      }),
      /*
       * Mandatory only for a temporary contract, and compared against the
       * contract type's CODE rather than its name or its id — an administrator
       * may rename "Kwa Muda" and the rule survives. This mirrors
       * RegisterCustomerRequest, which requires the date for TEMPORARY and
       * refuses it for anything else.
       */
      field("contract_expiry_date", "Contract Expiry Date", "date", "contractExpiryDate", {
        dependsOn: "contract_type_id",
        requiredWhen: { field: "contract_type_id", equals: ["TEMPORARY"] },
      })
    );
  }

  rows.push(
    field("basic_salary", "Basic Salary", "currency", "basicSalary"),
    field("take_home", "Take Home", "currency", "takeHome"),
    field("monthly_income", "Monthly Income", "currency", "monthlyIncome"),
    field("retirement_date", "Date of Retirement", "date", "retirementDate", {
      helpText: "Where the employer sets one.",
    })
  );

  return rows;
}

/** What a customer trades in, and what it brings in. */
function businessFields(): DynamicFormField[] {
  return [
    field("business_name", "Business Name", "text", "businessName"),
    field("business_type", "Business Type", "text", "businessType", {
      placeholder: "Retail, transport, agriculture…",
    }),
    field("business_address", "Business Address", "text", "businessAddress", { fullWidth: true }),
    /* Optional, and the label says so. A trader without one is the common
       case, and an unmarked box beside four required ones reads as an
       oversight rather than as a choice — `field` defaults `required` to
       false, so this is the wording catching up with the rule. */
    field("tin_number", "TIN Number (Optional)", "text", "tinNumber", {
      helpText: "Where the business is registered for tax.",
    }),
    field("monthly_income", "Monthly Income", "currency", "monthlyIncome"),
  ];
}

/**
 * Neither employed nor trading — a student, a pensioner, a dependant.
 *
 * Two questions, because the honest answer for a customer type that declares
 * itself neither is that the system knows one thing about their means and one
 * about what they do. Anything more specific belongs in that type's configured
 * form, where somebody who knows the answer can put it.
 */
function otherFields(): DynamicFormField[] {
  /* "Occupation" was dropped here for the same reason it was dropped from the
     employment block: every customer type now asks it in its own words — a
     student's "Kozi", a trader's "Aina Maalum ya Biashara" — and two boxes for
     one answer is what the officer had to guess between. Still a column, still
     editable from the profile. */
  return [field("monthly_income", "Monthly Income", "currency", "monthlyIncome")];
}

/**
 * Everything step two asks for this customer type — configured first, standard
 * after, nothing twice.
 *
 * Used by the step that RENDERS it and by the wizard that VALIDATES it, from
 * this one function, so the two cannot disagree about which questions were
 * asked. That disagreement is not hypothetical: it is what produced a Save
 * refused over a field the form had never drawn.
 */
export function registrationFieldsFor(
  category: CustomerCategory | undefined,
  profile: Pick<AccountTypeRequirementProfile, "requiresEmploymentDetails" | "requiresBusinessDetails">
): DynamicFormField[] {
  if (!category) return [];

  const configured = category.dynamicFormSchema ?? [];

  /* What the administrator's own form already writes to. A standard field
     aiming at the same column is dropped rather than shown beside it. */
  const covered = new Set<string>();
  const keys = new Set<string>();

  for (const f of configured) {
    keys.add(f.key);
    const target = structuredNameFor(f);
    if (target !== null) covered.add(target);
  }

  const standard: DynamicFormField[] = [];

  /*
   * The account type may demand a kind of detail the customer type's sector
   * does not suggest — a business account type opened by somebody the branch
   * classified as "other", say. Both conditions are honoured, because the
   * alternative is a save refused over a block the form declined to draw.
   */
  if (category.sector === "employment" || profile.requiresEmploymentDetails) {
    standard.push(...employmentFields(category));
  }

  if (category.sector === "business" || profile.requiresBusinessDetails) {
    standard.push(...businessFields());
  }

  if (standard.length === 0) standard.push(...otherFields());

  const merged = [...configured];

  /* Standard questions this type declines to ask. Configuration, not a rule
     about particular types written down here — see the category's own
     `omittedStandardFields`. Because this list feeds rendering AND validation,
     an omitted field is neither drawn, required, nor submitted. */
  const omitted = new Set(category.omittedStandardFields ?? []);

  for (const f of standard) {
    const target = f.storesIn ?? "";
    if (omitted.has(f.key)) continue;
    /* Dropped if the configured form already asks it, or if an earlier standard
       block did — "Monthly Income" belongs to both employment and business, and
       a customer who is both is asked once. */
    if (keys.has(f.key) || covered.has(target)) continue;

    keys.add(f.key);
    covered.add(target);
    merged.push(f);
  }

  return merged;
}

/**
 * The subset of the above that step two actually draws.
 *
 * Step one owns some of these columns now, and the payment chooser owns the
 * rest; drawing a second control for either would put two boxes behind one
 * value. Validation still runs against the whole list — see
 * `registrationFieldsFor`.
 */
export function renderableFields(fields: DynamicFormField[]): DynamicFormField[] {
  return fields.filter((f) => {
    const target = structuredNameFor(f);
    if (target === null) return true;
    return !BASIC_STEP_TARGETS.has(target as StructuredTarget) && !PAYMENT_TARGETS.has(target as StructuredTarget);
  });
}
