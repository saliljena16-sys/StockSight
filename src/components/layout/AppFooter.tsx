import { Wifi } from 'lucide-react';

interface AppFooterProps {
  /** Show the "live data unavailable" note (quotes loaded, none of them live). */
  showDemoNote: boolean;
}

export default function AppFooter({ showDemoNote }: AppFooterProps) {
  return (
    <footer className="mt-10 border-t border-white/[.07] py-6">
      <div className="mx-auto w-[calc(100%-24px)] max-w-[1680px] sm:w-[calc(100%-32px)] xl:w-[calc(100%-48px)]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            StockSight — Real-time stock data from multiple sources. For educational purposes only. Not financial advice.
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              Live prices refresh every 60s
            </span>
          </div>
        </div>
        {showDemoNote && (
          <div className="mt-3 pt-3 border-t border-[#e4b75c]/20">
            <p className="text-xs text-amber-300">
              <strong>Note:</strong> Live data APIs are currently unavailable. Showing simulated data for demonstration.
            </p>
          </div>
        )}
      </div>
    </footer>
  );
}
