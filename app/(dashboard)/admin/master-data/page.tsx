import { Database } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getMasterData, type MasterDataList, type MasterDataOption } from "@/lib/api/master-data";
import { getCustomerCategories } from "@/lib/api/customers";
import {
  MasterDataManager,
  type ListDefinition,
} from "@/features/admin/master-data/master-data-manager";
import { PageHeader } from "@/components/settings";

/**
 * Administration → Master Data.
 *
 * The institution states its own reference data here. The application ships
 * none of it: a fresh installation starts with every list below EMPTY, and the
 * registration and loan screens say so and point here rather than offering a
 * guess.
 *
 * The `emptyHint` on each list is what an administrator sees before there is
 * anything to see — it says what the list is FOR, which is the only useful
 * thing to say to somebody looking at zero rows.
 */
const LISTS: ListDefinition[] = [
  {
    key: "customer-types",
    label: "Customer Types",
    description: "The customer's legal form — individual, group, institution.",
    emptyHint: "Registration asks every customer which of these they are. Add the forms your institution recognises.",
  },
  {
    key: "customer-categories" as MasterDataList,
    label: "Customer Categories",
    description:
      "Which kind of customer this is. Decides the questions asked, the documents required, and which loan products they may take.",
    emptyHint:
      "Registration cannot complete without at least one category — it is what decides which questions a customer is asked and what they must produce.",
    /* Shown here, edited there. It is reference data in every sense an
       administrator cares about, but it is not a flat code/name lookup. */
    managedElsewhere: { href: "/admin/customer-categories", label: "Open Customer Categories" },
  },
  {
    key: "account-types",
    label: "Account Types",
    description: "What the customer is opening. Decides which registration steps are required.",
    emptyHint: "A loan account and a savings account ask for different things. Add the account types you offer.",
  },
  {
    key: "loan-types",
    label: "Loan Types",
    description: "The lending programme a customer is registered under.",
    emptyHint: "Add the lending programmes your institution runs.",
  },
  {
    key: "id-types",
    label: "ID Types",
    description: "Which identity documents your institution accepts.",
    emptyHint: "Registration asks for an ID type and its number. Until one exists, no identity document can be recorded.",
  },
  {
    key: "document-types",
    label: "Document Types",
    description: "What a customer may be asked to produce. Categories require these by code.",
    emptyHint: "A customer category's required documents point at these codes. Add the documents you collect.",
  },
  {
    key: "sectors",
    label: "Sectors",
    description: "Employing bodies for public servants, and the cadres within each.",
    emptyHint: "For customers who serve a public body. Add the body, then its categories underneath.",
  },
  {
    key: "employers",
    label: "Employers",
    description: "Private companies. Deliberately separate from sectors — a company has no cadres.",
    emptyHint: "For private-sector customers. Add the companies you lend against.",
  },
  {
    key: "contract-types",
    label: "Contract Types",
    description: "Terms of employment. A type coded TEMPORARY requires a contract expiry date.",
    emptyHint: "Add the contract terms you record. Use the code TEMPORARY for one that needs an expiry date.",
  },
  {
    key: "occupations",
    label: "Occupations",
    description: "What a customer does, where a list is preferred to free text.",
    emptyHint: "Optional. The registration form also accepts a typed occupation.",
  },
  {
    key: "work-types",
    label: "Work Types",
    description: "How a customer works.",
    emptyHint: "Add the working arrangements you record.",
  },
  {
    key: "employment-types",
    label: "Employment Types",
    description: "The sector of employment.",
    emptyHint: "Add the employment categories you record.",
  },
  {
    key: "banks",
    label: "Banks",
    description: "Where customer bank details are held, and where salaries are paid.",
    emptyHint: "Registration collects a bank account. Add the banks your customers use.",
  },
  {
    key: "mobile-money-providers",
    label: "Mobile Money Providers",
    description: "Wallet providers for disbursement and repayment.",
    emptyHint: "Add the mobile money providers you disburse through.",
  },
  {
    key: "marital-statuses",
    label: "Marital Statuses",
    description: "Offered on the registration form.",
    emptyHint: "Add the options your registration form should offer.",
  },
];

export default async function MasterDataPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  /*
   * Every list, loaded server-side so the first paint is populated and the
   * counts beside each name are true. `false` — the admin screen must see
   * disabled entries, which is the only way to re-enable one.
   */
  const managed = LISTS.filter((l) => l.managedElsewhere === undefined);

  const [results, categories] = await Promise.all([
    Promise.all(managed.map((l) => getMasterData(l.key, false).catch(() => [] as MasterDataOption[]))),
    getCustomerCategories().catch(() => []),
  ]);

  const initial = Object.fromEntries(managed.map((l, i) => [l.key, results[i]]));

  /*
   * Customer Categories, summarised. Enough to see what is configured without
   * leaving the screen — the facts an administrator checks at a glance are
   * which employment blocks a category asks for and how many documents it
   * demands, because those are what make a registration succeed or stall.
   */
  const specialised = {
    "customer-categories": categories
      .filter((c) => c.deletedAt === null)
      .map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        facts: [
          `${c.riskTier} risk`,
          `${c.requiredDocuments.length} document${c.requiredDocuments.length === 1 ? "" : "s"}`,
          `${c.dynamicFormSchema.length} extra field${c.dynamicFormSchema.length === 1 ? "" : "s"}`,
          ...(c.requiresSector ? ["sector"] : []),
          ...(c.requiresEmployer ? ["employer"] : []),
          ...(c.requiresContract ? ["contract"] : []),
          ...(c.requiresSalary ? ["salary"] : []),
        ],
      })),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Database}
        title="Master Data"
        description="The institution's own reference data. This application ships none of it — a new installation starts empty and is configured here."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Master Data" }]}
      />
      <MasterDataManager definitions={LISTS} initial={initial} specialised={specialised} />
    </div>
  );
}
