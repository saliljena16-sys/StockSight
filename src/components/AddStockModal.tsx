import { useState } from 'react';
import { Search, X, Plus, Globe } from 'lucide-react';
import { getAllAvailableTickers } from '../utils/mockData';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (ticker: string) => void;
  existingTickers: string[];
}

const POPULAR_STOCKS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'NFLX', 'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'DIS', 'BAC', 'INTC', 'CRM', 'PYPL'];

export default function AddStockModal({ isOpen, onClose, onAdd, existingTickers }: AddStockModalProps) {
  const [search, setSearch] = useState('');
  const availableTickers = getAllAvailableTickers();
  const filteredPopular = POPULAR_STOCKS.filter(t => !existingTickers.includes(t) && t.toLowerCase().includes(search.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">Add Stock</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <Globe className="w-3 h-3" />
              Live data from Yahoo Finance
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Enter any ticker (e.g., AAPL, TSLA)..."
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.length > 0 && !existingTickers.includes(search)) {
                  onAdd(search);
                  onClose();
                }
              }}
              className="w-full bg-slate-900/80 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>
          {search.length > 0 && !existingTickers.includes(search) && (
            <button
              onClick={() => {
                onAdd(search);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add {search} - Fetch Live Data</span>
            </button>
          )}
          <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">
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
                className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-emerald-500/50 transition-all text-center"
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
