/**
 * Shown while the first quotes load. It has the same shape as the real screen (holdings list and
 * stock panel), so nothing jumps when the data arrives.
 */
export default function PortfolioSkeleton({ rows }: { rows: number }) {
  const count = Math.min(Math.max(rows, 1), 6);

  return (
    <div role="status" aria-label="Loading live market data" className="grid gap-4 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] lg:items-start xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="-mx-4 flex gap-2 overflow-hidden px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:block lg:rounded-panel lg:border lg:border-line lg:bg-surface lg:p-0">
        <div className="hidden border-b border-line px-4 py-3 lg:block"><div className="skeleton h-4 w-24" /></div>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="w-[9.5rem] shrink-0 rounded-control border border-line bg-surface p-2.5 lg:flex lg:w-full lg:items-center lg:gap-3 lg:rounded-none lg:border-0 lg:border-b lg:px-4 lg:py-3 lg:last:border-b-0">
            <div className="skeleton h-7 w-7 shrink-0" />
            <div className="mt-2 flex-1 space-y-1.5 lg:mt-0">
              <div className="skeleton h-3.5 w-16" />
              <div className="skeleton h-3 w-24" />
            </div>
            <div className="mt-2 hidden space-y-1.5 lg:mt-0 lg:block">
              <div className="skeleton ml-auto h-3.5 w-20" />
              <div className="skeleton ml-auto h-3 w-12" />
            </div>
          </div>
        ))}
      </div>

      <div className="panel p-4 sm:p-5 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="skeleton h-10 w-10" />
            <div className="space-y-2">
              <div className="skeleton h-5 w-24" />
              <div className="skeleton h-3.5 w-36" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="skeleton ml-auto h-6 w-24" />
            <div className="skeleton ml-auto h-3.5 w-20" />
          </div>
        </div>
        <div className="skeleton mt-5 h-8 w-full max-w-md" />
        <div className="skeleton mt-4 h-[clamp(13.5rem,calc(100svh-39rem),20rem)] w-full md:h-[clamp(18rem,calc(100svh-40rem),26rem)] lg:h-[clamp(17rem,calc(100svh-34rem),34rem)]" />
        <p className="eyebrow mt-4 text-center">Fetching live market data</p>
      </div>
    </div>
  );
}
