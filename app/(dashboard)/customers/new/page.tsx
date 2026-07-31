import Link from "next/link";
import { UserPlus, Wand2 } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { customerNavFor } from "@/features/ledger/nav-items";
import { RegistrationFormPanel } from "@/features/customers/registration-form-panel";

/**
 * Customer → Register Customer.
 *
 * The legacy three-step form. The wired seven-step wizard that used to hold
 * this route is at /customers/new/register, unchanged and still the thing that
 * actually creates a customer — linked from the header so it stays one click
 * away rather than orphaned.
 */
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.CUSTOMERS_MANAGE])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={UserPlus}
        title="Customer Registration Form"
        description="Design pass — nothing here saves. Only the first of the old form's three steps was ever captured, and every dropdown but Branch is filled with inferred values."
        breadcrumb={[
          { label: "Customer", href: "/customers" },
          { label: "Register Customer" },
        ]}
        actions={
          <Link href="/customers/new/register" className="st-btn st-btn-secondary">
            <Wand2 className="size-4" strokeWidth={1.9} aria-hidden />
            Registration wizard
          </Link>
        }
      />
      <SectionNav items={customerNavFor(user)} />
      <RegistrationFormPanel />
    </>
  );
}
