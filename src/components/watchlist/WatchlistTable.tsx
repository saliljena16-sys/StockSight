import type { StockInfo } from '../../utils/mockData';
import type { PortfolioSummary as PortfolioSummaryData } from '../../utils/portfolioMetrics';
import type { Transaction } from '../../types/portfolio';
import type { WatchlistTableTab } from '../../types/views';
import PortfolioSummary from './PortfolioSummary';
import HoldingsTable from './HoldingsTable';
import KeyStatsTable from './KeyStatsTable';
import PerformanceTable from './PerformanceTable';

interface WatchlistTableProps {
  tableTab: WatchlistTableTab;
  /** Every loaded stock in the active portfolio. */
  stocks: StockInfo[];
  /** Stocks in the selected sector (only the Summary tab's table uses this). */
  filteredStocks: StockInfo[];
  sectorFilter: string;
  availableSectors: string[];
  onSectorChange: (sector: string) => void;
  onAddTickers: () => void;
  summary: PortfolioSummaryData;
  sectorAllocation: Array<[string, number]>;
  transactions: Transaction[];
  quantities: Record<string, number> | undefined;
  averageCosts: Record<string, number> | undefined;
  selectedTicker: string;
  onSelect: (ticker: string) => void;
  onEditHolding: (ticker: string) => void;
  onCashChange: (value: string) => void;
}

/** The watchlist's table view: sector picker and add button, plus the active tab's table. */
export default function WatchlistTable({
  tableTab,
  stocks,
  filteredStocks,
  sectorFilter,
  availableSectors,
  onSectorChange,
  onAddTickers,
  summary,
  sectorAllocation,
  transactions,
  quantities,
  averageCosts,
  selectedTicker,
  onSelect,
  onEditHolding,
  onCashChange,
}: WatchlistTableProps) {
  return (
    <div className="mb-7 overflow-hidden rounded-[10px] border border-white/[.1] bg-[var(--surface-1)]">
      {tableTab !== 'summary' && <div className="flex items-center justify-end gap-3 border-b border-white/[.07] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-[7px] border border-white/[.09] bg-white/[.03] px-3 py-2 text-xs text-[#89918b]">
            <span>Sector</span>
            <select
              value={sectorFilter}
              onChange={(event) => onSectorChange(event.target.value)}
              className="bg-[#101411] text-white outline-none"
            >
              <option value="All">All</option>
              {availableSectors.map((sector) => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </label>
          <button
            onClick={onAddTickers}
            className="rounded-[7px] border border-white/[.1] bg-white/[.04] px-3 py-2 text-xs font-medium text-white hover:bg-white/[.08]"
          >
            + Add tickers
          </button>
        </div>
      </div>}

      <div className="overflow-x-auto">
        {tableTab === 'summary' && (
          <PortfolioSummary
            summary={summary}
            sectorAllocation={sectorAllocation}
            transactions={transactions}
            filteredStocks={filteredStocks}
            quantities={quantities}
            selectedTicker={selectedTicker}
            onSelect={onSelect}
            onEditHolding={onEditHolding}
            onCashChange={onCashChange}
          />
        )}

        {tableTab === 'holdings' && (
          <HoldingsTable stocks={stocks} quantities={quantities} averageCosts={averageCosts} selectedTicker={selectedTicker} onSelect={onSelect} onEditHolding={onEditHolding} />
        )}

        {tableTab === 'keyStats' && (
          <KeyStatsTable stocks={stocks} selectedTicker={selectedTicker} onSelect={onSelect} />
        )}

        {tableTab === 'performance' && (
          <PerformanceTable stocks={stocks} selectedTicker={selectedTicker} onSelect={onSelect} />
        )}
      </div>
    </div>
  );
}
