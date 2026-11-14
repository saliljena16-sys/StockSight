import type { StockInfo } from '../../utils/mockData';
import { calculateKeyStats } from '../../utils/keyStats';
import { formatCompactNumber, formatPrice } from '../../utils/format';
import { HEAD_CELL_CLASS, SymbolCell, TABLE_CLASS, rowProps } from './tableParts';

// Columns shown as "—" until a real fundamentals source (earnings, dividends, book value) is wired in.
const UNAVAILABLE_FUNDAMENTALS = ['EPS Est. Next Yr', 'Forward P/E', 'Div Paymt Date', 'Ex-Div Date', 'Div/Share', 'Fwd Ann Div Rate', 'Fwd Ann Div Yield', 'Ttl Ann Div Rate', 'Ttl Ann Div Yield', 'Price / Book'];

interface KeyStatsTableProps {
  stocks: StockInfo[];
  selectedTicker: string;
  onSelect: (ticker: string) => void;
}

/** Key Stats tab: price, market cap, volume and 52-week range from live data only. */
export default function KeyStatsTable({ stocks, selectedTicker, onSelect }: KeyStatsTableProps) {
  return (
    <table className={TABLE_CLASS}>
      <caption className="border-b border-line px-4 py-3 text-left font-sans text-xs leading-5 text-ink-muted sm:px-5">
        Last price from Finnhub quotes · market cap = last price × Finnhub shares outstanding · volume and 52-week range from Yahoo Finance daily candles.
        <span className="text-ink-dim"> Earnings, valuation and dividend fields need a fundamentals feed that isn&apos;t connected, so they show —. Demo rows report nothing.</span>
      </caption>
      <thead>
        <tr>
          {['Symbol', 'Last Price', 'Market Cap', 'Volume (Last Session)', 'Avg Vol (3M)', '52-Wk Low', '52-Wk High'].map((header) => (
            <th key={header} className={HEAD_CELL_CLASS}>{header}</th>
          ))}
          {UNAVAILABLE_FUNDAMENTALS.map((header) => (
            <th key={header} title="Not available: no fundamentals data source is connected" className={HEAD_CELL_CLASS}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock) => {
          const stats = calculateKeyStats(stock);

          return (
            <tr key={stock.ticker} {...rowProps(stock.ticker, selectedTicker, onSelect)}>
              <SymbolCell
                ticker={stock.ticker}
                selected={stock.ticker === selectedTicker}
                onSelect={onSelect}
                badge={!stock.isLiveData && <span className="chip border-warn/35 text-warn">Demo</span>}
              />
              <td className="px-3 py-1 text-ink">{formatPrice(stats.lastPrice)}</td>
              <td className="px-3 py-1">{formatCompactNumber(stats.marketCap)}</td>
              <td className="px-3 py-1" title={stats.lastVolumeDate ? `Session of ${stats.lastVolumeDate}` : undefined}>{formatCompactNumber(stats.lastVolume)}</td>
              <td className="px-3 py-1">{formatCompactNumber(stats.avgVolume3M)}</td>
              <td className="px-3 py-1">{formatPrice(stats.week52Low)}</td>
              <td className="px-3 py-1">{formatPrice(stats.week52High)}</td>
              {UNAVAILABLE_FUNDAMENTALS.map((header) => (
                <td key={header} className="px-3 py-1 text-ink-dim">—</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
