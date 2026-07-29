import { Lock, Percent } from "lucide-react";
import { MOCK_INTEREST_FORMULAS } from "@/lib/mock-data/interest-formulas";
import { FormulaFormDialog } from "@/features/admin/interest-formulas/formula-form-dialog";
import { PageHeader, SettingsCard, StatusBadge } from "@/components/settings";

export default function InterestFormulasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Percent}
        title="Interest Formular"
        description="Simple, flat rate, and reducing balance calculation methods."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Interest Formular" }]}
      />

      {/*
        The constraint is the point of this screen, so it is stated once, up
        front, rather than discovered when a field turns out to be read-only.
      */}
      <div
        className="flex items-start gap-3 rounded-[14px] border px-4 py-3.5"
        style={{ background: "var(--st-accent-soft)", borderColor: "#d8e3fc" }}
      >
        <Lock className="mt-0.5 size-4 shrink-0 text-[var(--st-accent)]" strokeWidth={1.9} aria-hidden />
        <p className="text-[13px] leading-relaxed text-[#2a4f9e]">
          These three calculation methods are fixed by the loan engine. Only the label and description are
          editable — the maths behind each one cannot be changed here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_INTEREST_FORMULAS.map((formula) => (
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
            footer={<FormulaFormDialog formula={formula} />}
          />
        ))}
      </div>
    </div>
  );
}
