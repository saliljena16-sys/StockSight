import { Pencil, Plus } from 'lucide-react';
import type { StockInfo } from '../../utils/mockData';
import { dayChangePercent } from '../../utils/marketMetrics';
import { formatCurrency, formatShares, formatSignedPercent } from '../../utils/format';
import CompanyMark from '../CompanyMark';
import Delta from '../ui/Delta';
import Sparkline from '../ui/Sparkline';

interface HoldingsListProps {
  /** Every stock in the active portfolio, in watchlist order. */
  stocks: StockInfo[];
  quantities: Record<string, number> | undefined;
  selectedTicker: string;
  onSelect: (ticker: string) => void;
  /** Opens the holding dialog for a stock (edit shares, or add them if it is only watched). */
  onEditHolding: (ticker: string) => void;
  className?: string;
}

/**
 * The portfolio's stocks: holdings with their value, watched stocks with their price. Selecting
 * one shows it in the detail panel alongside. A vertical list from laptop width up; on smaller
 * screens a horizontally scrolling strip, so the chart below stays on the first screen.
 */
export default function HoldingsList({ stocks, quantities, selectedTicker, onSelect, onEditHolding, className = '' }: HoldingsListProps) {
  const heldCount = stocks.filter(stock => (quantities?.[stock.ticker] ?? 0) > 0).length;
  const watchingCount = stocks.length - heldCount;

  return (
    <section aria-labelledby="holdings-heading" className={`flex min-w-0 flex-col lg:overflow-hidden lg:rounded-panel lg:border lg:border-line lg:bg-surface ${className}`}>
      {/* The label row is visible from laptop width up; on small screens it is for screen readers only, to keep the chart on the first screen. */}
      <div className="sr-only items-baseline justify-between gap-3 lg:not-sr-only lg:flex lg:border-b lg:border-line lg:px-4 lg:py-3">
        <h2 id="holdings-heading" className="eyebrow text-ink-muted">{heldCount > 0 ? 'Holdings' : 'Watchlist'}</h2>
        <p className="eyebrow">
          {heldCount > 0 && <>{heldCount} held</>}
          {heldCount > 0 && watchingCount > 0 && ' · '}
          {watchingCount > 0 && <>{watchingCount} watching</>}
        </p>
      </div>

      <ul className="mobile-scroll -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:block lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden lg:p-0 lg:pb-0">
        {stocks.map(stock => {
          const quantity = quantities?.[stock.ticker] ?? 0;
          const held = quantity > 0;
          const selected = stock.ticker === selectedTicker;
          const change = dayChangePercent(stock);
          const recentCloses = stock.historicalData.slice(-24).map(point => point.close);

          return (
            <li key={stock.ticker} className="relative shrink-0 snap-start lg:border-b lg:border-line lg:last:border-b-0">
              <button
                type="button"
                data-ticker={stock.ticker}
                aria-pressed={selected}
                onClick={() => onSelect(stock.ticker)}
                className={`relative flex w-[9.5rem] flex-col gap-1.5 rounded-control border p-2.5 text-left lg:w-full lg:flex-row lg:items-center lg:gap-3 lg:rounded-none lg:border-0 lg:py-3 lg:pl-4 lg:pr-14 ${
                  selected ? 'border-line-strong bg-raised' : 'border-line bg-surface hover:bg-raised'
                }`}
              >
                {selected && <span className="absolute inset-y-2.5 left-0 w-0.5 rounded-full bg-accent lg:inset-y-0 lg:rounded-none" aria-hidden="true" />}

                <span className="flex min-w-0 items-center gap-2.5 lg:flex-1">
                  <CompanyMark ticker={stock.ticker} size={28} />
                  <span className="min-w-0">
                    <span className="num block text-sm font-medium leading-5 text-ink">{stock.ticker}</span>
                    <span className="num block truncate text-xs leading-4 text-ink-dim">
                      {held ? `${formatShares(quantity)} sh` : 'Watching'}
                      {held && <span className="hidden lg:inline"> · ${stock.currentPrice.toFixed(2)}</span>}
                    </span>
                  </span>
                </span>

                <Sparkline values={recentCloses} positive={change >= 0} className="hidden xl:block" />

                <span className="block lg:w-24 lg:shrink-0 lg:text-right">
                  <span className="num block text-sm leading-5 text-ink">{held ? formatCurrency(stock.currentPrice * quantity) : `$${stock.currentPrice.toFixed(2)}`}</span>
                  <Delta value={change} className="text-xs leading-4 lg:justify-end">{formatSignedPercent(change)}</Delta>
                </span>
              </button>

              <button
                type="button"
                onClick={() => onEditHolding(stock.ticker)}
                aria-label={held ? `Edit ${stock.ticker} holding` : `Add ${stock.ticker} shares`}
                title={held ? 'Edit holding' : 'Add shares'}
                className="icon-btn icon-btn-plain icon-btn-sm absolute right-3 top-1/2 hidden -translate-y-1/2 text-ink-dim lg:inline-grid"
              >
                {held ? <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
