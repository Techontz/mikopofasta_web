import { Lock, Percent } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getInterestFormulas } from "@/lib/api/loans";
import { FormulaFormDialog } from "@/features/admin/interest-formulas/formula-form-dialog";
import { PageHeader, SettingsCard, StatusBadge } from "@/components/settings";

export default async function InterestFormulasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  /*
   * No permission gate on the read. Formulas are reference data half the
   * application needs to render a loan product, and the API says the same —
   * SystemConfigurationPolicy::view() is open. Editing needs
   * `admin.org_settings`, and the API refuses without it.
   */
  const formulas = await getInterestFormulas();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Percent}
        title="Interest Formula"
        description="Simple, flat rate, and reducing balance calculation methods."
        breadcrumb={[{ label: "Administration", href: "/admin" }, { label: "Interest Formula" }]}
      />

      {/*
        The constraint is the point of this screen, so it is stated once, up
        front, rather than discovered when a field turns out to be read-only.
      */}
      <div
        className="flex items-start gap-3 rounded-[var(--st-radius)] border px-4 py-3.5"
        style={{ background: "var(--st-accent-soft)", borderColor: "var(--st-accent-line)" }}
      >
        <Lock className="mt-0.5 size-4 shrink-0 text-[var(--st-accent)]" strokeWidth={1.9} aria-hidden />
        <p className="text-[13px] leading-relaxed text-[var(--st-accent-ink)]">
          These three calculation methods are fixed by the loan engine. Only the label and description are
          editable — the maths behind each one cannot be changed here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {formulas.map((formula) => (
          <SettingsCard
            key={formula.id}
            className="flex flex-col"
            title={formula.name}
            description={formula.description ?? undefined}
            actions={
              <StatusBadge tone="neutral" dot={false} className="font-mono">
                {formula.code}
              </StatusBadge>
            }
            footer={
              <div className="flex w-full items-center justify-between gap-3">
                {/* What is riding on the label being clear. */}
                <span className="text-[12px] text-muted-foreground">
                  {formula.productCount} product{formula.productCount === 1 ? "" : "s"}
                </span>
                <FormulaFormDialog formula={formula} />
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}
