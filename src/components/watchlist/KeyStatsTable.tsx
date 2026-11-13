import type { StockInfo } from '../../utils/mockData';
import { calculateKeyStats } from '../../utils/keyStats';
import { formatCompactNumber, formatPrice } from '../../utils/format';
import CompanyMark from '../CompanyMark';

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
    <table className="data-table min-w-full border-separate border-spacing-0 text-left text-[#a2aaa4]">
      <caption className="border-b border-white/[.07] px-4 py-3 text-left text-xs leading-5 text-[var(--text-secondary)]">
        Last price from Finnhub quotes · market cap = last price × Finnhub shares outstanding · volume and 52-week range from Yahoo Finance daily candles.
        <span className="text-[var(--text-tertiary)]"> Earnings, valuation and dividend fields need a fundamentals feed that isn't connected, so they show —. Demo rows report nothing.</span>
      </caption>
      <thead className="bg-black/20">
        <tr>
          {['Symbol', 'Last Price', 'Market Cap', 'Volume (Last Session)', 'Avg Vol (3M)', '52-Wk Low', '52-Wk High'].map((header) => (
            <th key={header} className="border-b border-white/[.07] px-3 py-3 whitespace-nowrap">{header}</th>
          ))}
          {UNAVAILABLE_FUNDAMENTALS.map((header) => (
            <th key={header} title="Not available: no fundamentals data source is connected" className="border-b border-white/[.07] px-3 py-3 whitespace-nowrap text-[var(--text-tertiary)]">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock) => {
          const stats = calculateKeyStats(stock);

          return (
            <tr
              key={stock.ticker}
              className={`hover:bg-white/[.035] ${stock.ticker === selectedTicker ? 'bg-white/[.045]' : ''}`}
              onClick={() => onSelect(stock.ticker)}
            >
              <td className={`border-l-2 px-3 py-3 !text-left ${stock.ticker === selectedTicker ? 'border-lime-300' : 'border-transparent'}`}>
                <div className="flex items-center gap-2.5">
                  <CompanyMark ticker={stock.ticker} size={24} />
                  <span className="font-semibold text-white">{stock.ticker}</span>
                  {!stock.isLiveData && <span className="rounded-full border border-amber-300/25 px-1.5 py-0.5 text-[10px] text-amber-200/80">Demo</span>}
                </div>
              </td>
              <td className="px-3 py-3 text-white">{formatPrice(stats.lastPrice)}</td>
              <td className="px-3 py-3">{formatCompactNumber(stats.marketCap)}</td>
              <td className="px-3 py-3" title={stats.lastVolumeDate ? `Session of ${stats.lastVolumeDate}` : undefined}>{formatCompactNumber(stats.lastVolume)}</td>
              <td className="px-3 py-3">{formatCompactNumber(stats.avgVolume3M)}</td>
              <td className="px-3 py-3">{formatPrice(stats.week52Low)}</td>
              <td className="px-3 py-3">{formatPrice(stats.week52High)}</td>
              {UNAVAILABLE_FUNDAMENTALS.map((header) => (
                <td key={header} className="px-3 py-3 text-[var(--text-tertiary)]">—</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
