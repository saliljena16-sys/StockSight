import { Plus } from 'lucide-react';
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
  onSelectTab: (tab: WatchlistTableTab) => void;
  /** Every loaded stock in the active portfolio. */
  stocks: StockInfo[];
  /** Stocks in the selected sector (only the Summary tab's table uses this, and shows the filter). */
  filteredStocks: StockInfo[];
  sectorFilter: string;
  availableSectors: string[];
  onSectorChange: (sector: string) => void;
  onAddHolding: () => void;
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

const TABS: Array<{ label: string; value: WatchlistTableTab }> = [
  { label: 'Summary', value: 'summary' },
  { label: 'Holdings', value: 'holdings' },
  { label: 'Key Stats', value: 'keyStats' },
  { label: 'Performance', value: 'performance' },
];

/** The portfolio's detailed tables, below the holdings and chart: tabs plus the active tab's table. */
export default function WatchlistTable({
  tableTab,
  onSelectTab,
  stocks,
  filteredStocks,
  sectorFilter,
  availableSectors,
  onSectorChange,
  onAddHolding,
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
    <section aria-label="Portfolio tables" className="panel mt-4 overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 sm:px-5">
        <div className="mobile-scroll flex items-center gap-5 overflow-x-auto" role="group" aria-label="Portfolio tables">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onSelectTab(tab.value)}
              aria-pressed={tableTab === tab.value}
              className="tab lg:min-h-12"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onAddHolding} className="btn btn-secondary btn-sm hidden shrink-0 sm:inline-flex">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />Add holding
        </button>
      </div>

      <div className="overflow-x-auto">
        {tableTab === 'summary' && (
          <PortfolioSummary
            summary={summary}
            sectorAllocation={sectorAllocation}
            transactions={transactions}
            filteredStocks={filteredStocks}
            sectorFilter={sectorFilter}
            availableSectors={availableSectors}
            onSectorChange={onSectorChange}
            quantities={quantities}
            averageCosts={averageCosts}
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
    </section>
  );
}
