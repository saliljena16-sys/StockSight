import { useState } from 'react';
import { Search, X, Plus, Globe } from 'lucide-react';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (ticker: string) => void;
  existingTickers: string[];
}

const POPULAR_STOCKS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'NFLX', 'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'DIS', 'BAC', 'INTC', 'CRM', 'PYPL'];

export default function AddStockModal({ isOpen, onClose, onAdd, existingTickers }: AddStockModalProps) {
  const [search, setSearch] = useState('');
  const filteredPopular = POPULAR_STOCKS.filter(t => !existingTickers.includes(t) && t.toLowerCase().includes(search.toLowerCase()));
  const isValidTicker = /^[A-Z][A-Z.-]{0,5}$/.test(search);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" onClick={onClose}></div>
      <div role="dialog" aria-modal="true" aria-labelledby="add-stock-title" className="relative bg-[#101411] border border-white/[.12] rounded-[10px] w-full max-w-md shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between p-5 border-b border-white/[.08]">
          <div>
            <h2 id="add-stock-title" className="text-lg font-semibold text-white">Add stock</h2>
            <p className="text-xs text-[#68716a] flex items-center gap-1 mt-1">
              <Globe className="w-3 h-3" />
              Live quote when available · transparent demo fallback
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="min-h-10 min-w-10 grid place-items-center text-[#89918b] hover:text-white hover:bg-white/[.05] rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#68716a]" />
            <input
              type="text"
              placeholder="Enter any ticker (e.g., AAPL, TSLA)..."
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValidTicker && !existingTickers.includes(search)) {
                  onAdd(search);
                  onClose();
                }
              }}
              className="w-full bg-black/25 border border-white/[.12] rounded-[7px] pl-10 pr-4 py-3 text-white text-sm placeholder:text-[#59615b] focus:outline-none focus:border-lime-300/50"
              autoFocus
            />
          </div>
          {search.length > 0 && !isValidTicker && <p role="alert" className="-mt-2 mb-4 text-xs text-amber-300">Use a valid 1–6 character US ticker symbol.</p>}
          {isValidTicker && !existingTickers.includes(search) && (
            <button
              onClick={() => {
                onAdd(search);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 p-3 mb-4 rounded-[7px] bg-lime-300 text-[#10140f] hover:bg-lime-200"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">Add {search}</span>
            </button>
          )}
          <h3 className="text-[10px] text-[#68716a] uppercase tracking-[.14em] mb-2">
            {search ? 'Matching' : 'Popular'} Stocks
          </h3>
          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {(search ? filteredPopular : POPULAR_STOCKS.filter(t => !existingTickers.includes(t))).map(ticker => (
              <button
                key={ticker}
                onClick={() => {
                  onAdd(ticker);
                  onClose();
                }}
                className="min-h-10 p-2.5 rounded-[7px] bg-white/[.025] border border-white/[.08] hover:border-lime-300/30 hover:bg-white/[.05] text-center"
              >
                <span className="text-white font-semibold text-sm">{ticker}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
