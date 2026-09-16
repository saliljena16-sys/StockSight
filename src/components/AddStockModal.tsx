import { useState } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { getAllAvailableTickers } from '../utils/mockData';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (ticker: string) => void;
  existingTickers: string[];
}

export default function AddStockModal({ isOpen, onClose, onAdd, existingTickers }: AddStockModalProps) {
  const [search, setSearch] = useState('');
  const availableTickers = getAllAvailableTickers();
  
  const filteredTickers = availableTickers.filter(
    t => !existingTickers.includes(t) && t.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">Add Stock</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ticker (e.g., AAPL, TSLA)..."
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
              className="w-full bg-slate-900/80 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
              autoFocus
            />
          </div>

          {/* Ticker List */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredTickers.length > 0 ? (
              filteredTickers.map(ticker => (
                <button
                  key={ticker}
                  onClick={() => { onAdd(ticker); onClose(); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
                >
                  <div>
                    <span className="text-white font-semibold">{ticker}</span>
                  </div>
                  <Plus className="w-4 h-4 text-emerald-400" />
                </button>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">No stocks found</p>
                <p className="text-slate-500 text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </div>

          {/* Custom ticker input */}
          {search.length > 0 && !availableTickers.includes(search) && !existingTickers.includes(search) && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <button
                onClick={() => { onAdd(search); onClose(); }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add {search} (Custom)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
