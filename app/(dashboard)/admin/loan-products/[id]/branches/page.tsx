import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/settings";
import { getProductBranches } from "@/lib/api/loan-product-branches";
import { BranchAssignment } from "@/features/admin/loan-products/branch-assignment";

/**
 * Administration → Loan Category → Assign Branch.
 *
 * Which branches offer one loan product. Reached from the green action on the
 * Loan Category list, and from the blue list action beside it.
 */
export default async function LoanProductBranchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data;
  try {
    data = await getProductBranches(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title="Loan Category Assign"
        description="Which branches offer this loan product. Assign none and it is offered at every branch."
        breadcrumb={[
          { label: "Administration", href: "/admin" },
          { label: "Loan Category", href: "/admin/loan-products" },
          { label: data.product.name },
        ]}
      />
      <BranchAssignment productId={id} data={data} />
    </div>
  );
}
