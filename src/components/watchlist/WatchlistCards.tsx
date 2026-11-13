import { EyeOff, Plus } from 'lucide-react';
import type { StockInfo } from '../../utils/mockData';
import { analyzeStock } from '../../utils/technicalAnalysis';
import StockCard from '../StockCard';

interface WatchlistCardsProps {
  stocks: StockInfo[];
  selectedTicker: string;
  onSelect: (ticker: string) => void;
  /** Whether cards show a remove button (not for the last stock). */
  canRemove: boolean;
  onRemove: (ticker: string) => void;
  onAddSymbol: () => void;
}

/** The watchlist's card view: one card per stock plus an "Add symbol" tile. */
export default function WatchlistCards({ stocks, selectedTicker, onSelect, canRemove, onRemove, onAddSymbol }: WatchlistCardsProps) {
  return (
    <>
    <div className="mb-5 flex items-end justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[.2em] text-[#69716b] mb-1.5">Watchlist</p>
        <h2 className="text-2xl font-semibold tracking-[-.04em] text-white">Market overview</h2>
      </div>
      <p className="hidden sm:block text-xs text-[#69716b]">Select a symbol to inspect</p>
    </div>
    <div className="mb-6 grid min-w-0 grid-cols-1 gap-3 min-[520px]:grid-cols-2 sm:mb-8 xl:grid-cols-4">
      {stocks.map((stock) => {
        const stockAnalysis = analyzeStock(stock.historicalData, stock.hasRealHistory);
        return (
          <div key={stock.ticker} className="group relative min-w-0">
            <StockCard
              stock={stock}
              analysis={stockAnalysis}
              isSelected={stock.ticker === selectedTicker}
              onClick={() => onSelect(stock.ticker)}
            />
            {canRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(stock.ticker);
                }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded bg-black/40 hover:bg-rose-500/20 text-[#89918b] hover:text-rose-400"
                title="Remove stock"
              >
                <EyeOff className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={onAddSymbol}
        className="p-4 rounded-[10px] border border-dashed border-white/[.12] hover:border-lime-300/40 hover:bg-lime-300/[.025] transition-all flex flex-col items-center justify-center gap-2 min-h-[148px]"
      >
        <Plus className="w-5 h-5 text-[#69716b]" />
        <span className="text-xs text-[#89918b]">Add symbol</span>
      </button>
    </div>
    </>
  );
}
