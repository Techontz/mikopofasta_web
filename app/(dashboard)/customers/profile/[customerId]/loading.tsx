import { PageHeaderSkeleton } from "@/components/settings";

/**
 * The profile skeleton.
 *
 * Mirrors the metrics of what it stands in for — the same header height, the
 * same four tiles, the same tab rail — so the real profile lands where the
 * placeholder was instead of shoving the page around as it arrives.
 */
export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />

      {/* Section rail */}
      <Bar className="h-9 w-full rounded-lg" />

      {/* Header card: avatar, name block, actions, then the facts grid. */}
      <section className="st-card overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start">
          <div className="flex items-start gap-4">
            <Bar className="size-20 shrink-0 rounded-[var(--st-radius-md)]" />
            <div className="space-y-2.5 pt-1">
              <Bar className="h-5 w-56" />
              <Bar className="h-3.5 w-32" />
              <div className="flex gap-2 pt-1">
                <Bar className="h-6 w-24 rounded-full" />
                <Bar className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 lg:ml-auto">
            <Bar className="h-9 w-[200px] rounded-[var(--st-radius-sm)]" />
            <Bar className="h-9 w-28 rounded-[var(--st-radius-sm)]" />
          </div>
        </div>
        <div className="border-t px-5 py-4 sm:px-6" style={{ borderColor: "var(--st-line)" }}>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Bar className="h-3 w-24" />
                <Bar className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="st-card space-y-3 p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <Bar className="h-3 w-28" />
              <Bar className="size-7 rounded-[var(--st-radius-xs)]" />
            </div>
            <Bar className="h-6 w-32" />
          </div>
        ))}
      </div>

      {/* Tab rail, then the first panel */}
      <Bar className="h-9 w-full rounded-lg" />
      <div className="st-card space-y-5 p-5 sm:p-6">
        <div className="space-y-2">
          <Bar className="h-4 w-40" />
          <Bar className="h-3.5 w-80 max-w-full" />
        </div>
        <div className="grid gap-x-5 gap-y-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Bar className="h-3 w-24" />
              <Bar className="h-9 w-full rounded-[var(--st-radius-sm)]" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* `--st-skeleton` moves with the theme, so a dark-mode load is dark rather
   than a flashbulb of light grey. */
function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--st-radius-xs)] bg-[var(--st-skeleton)] ${className ?? ""}`} />;
}
