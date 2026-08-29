import { SlidersHorizontal } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getRegistrationRequirements } from "@/lib/api/registration";
import { getMasterData, type MasterDataOption } from "@/lib/api/master-data";
import { getCustomerCategories } from "@/lib/api/customers";
import { getEligibilityMatrix, getLoanProducts } from "@/lib/api/loans";
import { RegistrationRulesPanel } from "@/features/admin/registration-rules/registration-rules-panel";
import { PageHeader } from "@/components/settings";

/**
 * Administration → Registration & Eligibility Rules.
 *
 * Both halves were APIs with no screen: an administrator could read what
 * registration demanded and what each category could borrow, and could change
 * neither without a database client. The document-enforcement switch and its
 * cutoff date live here too — the one setting in this application that can
 * take an existing customer's eligibility away, so it is the one that most
 * needed a screen saying what it does before it is saved.
 */
export default async function RegistrationRulesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [requirements, accountTypes, categories, products] = await Promise.all([
    getRegistrationRequirements(),
    getMasterData("account-types", false).catch(() => [] as MasterDataOption[]),
    getCustomerCategories().catch(() => []),
    getLoanProducts().catch(() => []),
  ]);

  const active = categories.filter((c) => c.deletedAt === null);
  const eligibility = active.length > 0
    ? await getEligibilityMatrix(active.map((c) => c.id)).catch(() => [])
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={SlidersHorizontal}
        title="Registration & Eligibility Rules"
        description="What registration demands of a customer, and which loan products each category may borrow."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Registration & Eligibility" }]}
      />
      <RegistrationRulesPanel
        profiles={requirements.profiles}
        accountTypes={accountTypes}
        categories={active}
        products={products}
        eligibility={eligibility}
      />
    </div>
  );
}
