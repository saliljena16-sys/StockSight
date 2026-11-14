import { Wifi } from 'lucide-react';

interface AppFooterProps {
  /** Show the "live data unavailable" note (quotes loaded, none of them live). */
  showDemoNote: boolean;
}

export default function AppFooter({ showDemoNote }: AppFooterProps) {
  return (
    <footer className="mt-12 border-t border-line pb-[calc(5rem+env(safe-area-inset-bottom))] pt-6 md:pb-8">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs leading-5 text-ink-dim">
            StockSight — Real-time stock data from multiple sources. For educational purposes only. Not financial advice.
          </p>
          <span className="eyebrow flex shrink-0 items-center gap-1.5">
            <Wifi className="h-3 w-3" aria-hidden="true" />
            Live prices refresh every 60s
          </span>
        </div>
        {showDemoNote && (
          <p className="mt-4 border-t border-warn/25 pt-4 text-xs leading-5 text-warn">
            <strong>Note:</strong> Live data APIs are currently unavailable. Showing simulated data for demonstration.
          </p>
        )}
      </div>
    </footer>
  );
}
