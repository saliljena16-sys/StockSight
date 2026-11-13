import { Loader2 } from 'lucide-react';

/** Shown while the first quotes for the watchlist load. */
export default function WatchlistLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
      <h2 className="text-lg font-semibold text-white mb-2">Fetching Live Market Data</h2>
      <p className="text-slate-400 text-sm">Connecting to APIs...</p>
    </div>
  );
}
