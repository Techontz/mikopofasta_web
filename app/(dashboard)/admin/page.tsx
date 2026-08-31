import Link from "next/link";
import { ArrowRight, Layers, Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { ADMIN_SECTIONS, isSectionVisible } from "@/config/admin-sections";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { PageHeader } from "@/components/settings";
import { EmptyState } from "@/components/feedback/empty-state";

export default async function AdminLandingPage() {
  const user = await getCurrentUser();
  const sections = user ? ADMIN_SECTIONS.filter((section) => isSectionVisible(user, section)) : [];
  const canGovern = user ? hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS) : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        description="Organization-wide configuration."
        breadcrumb={[{ label: "Administration" }]}
      />

      {/*
        The Super Admin console, kept OUT of the legacy Settings grid below.
        That grid reproduces the old system's menu verbatim — entries, order and
        spellings — because operators have navigated it for years, and adding to
        it would be a change to how people work. This is a new surface the
        enterprise structure needed, so it sits above the menu rather than
        inside it.
      */}
      {canGovern && (
        <Link href="/admin/structure" className="st-card st-card-link group flex items-start gap-3 p-5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border"
            style={{ background: "var(--st-accent-soft)", borderColor: "#dde6fb", color: "var(--st-accent)" }}
          >
            <Layers className="size-[18px]" strokeWidth={1.8} aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="text-[14.5px] font-semibold tracking-[-0.01em] text-[var(--st-ink)]">
              Organization Structure
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--st-ink-soft)]">
              Super Admin → Head Office → Zones → Branches, who staffs each tier, and which branches nobody
              supervises.
            </p>
          </div>
          <ArrowRight
            className="mt-1 size-4 text-[var(--st-line-strong)] transition-colors group-hover:text-[var(--st-accent)]"
            aria-hidden
          />
        </Link>
      )}

      {sections.length === 0 ? (
        <EmptyState
          title="No settings available"
          description="Your role does not grant access to any configuration section."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const body = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="flex size-9 items-center justify-center rounded-[10px] border"
                    style={{ background: "var(--st-accent-soft)", borderColor: "#dde6fb", color: "var(--st-accent)" }}
                  >
                    <section.icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
                  </span>
                  {section.href ? (
                    <ArrowRight
                      className="mt-1 size-4 text-[var(--st-line-strong)] transition-colors group-hover:text-[var(--st-accent)]"
                      aria-hidden
                    />
                  ) : (
                    <Lock className="mt-1 size-3.5 text-[var(--st-line-strong)]" aria-hidden />
                  )}
                </div>
                <div>
                  <h2 className="text-[14.5px] font-semibold tracking-[-0.01em] text-[var(--st-ink)]">
                    {section.title}
                  </h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--st-ink-soft)]">{section.description}</p>
                </div>
              </>
            );

            /*
             * An entry with no route yet keeps its card and its place in the
             * order — it simply does not pretend to lead anywhere.
             */
            return section.href ? (
              <Link
                key={section.title}
                href={section.href}
                className="st-card st-card-link group flex flex-col gap-3 p-5"
              >
                {body}
              </Link>
            ) : (
              <div
                key={section.title}
                aria-disabled="true"
                className="st-card flex flex-col gap-3 p-5 opacity-70"
              >
                {body}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
