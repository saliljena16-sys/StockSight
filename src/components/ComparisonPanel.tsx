import { useMemo, useState } from 'react';
import { StockInfo } from '../utils/mockData';
import { calculatePerformance } from '../utils/performance';
import { calculateCAGR } from '../utils/technicalAnalysis';
import { SERIES_COLORS as COLORS } from '../theme/tokens';
import CompanyMark from './CompanyMark';
import HistoryUnavailable from './HistoryUnavailable';

export default function ComparisonPanel({ stocks }: { stocks: StockInfo[] }) {
  const [selected, setSelected] = useState(() => stocks.slice(0, 3).map(stock => stock.ticker));
  const compared = stocks.filter(stock => selected.includes(stock.ticker)).slice(0, 3);
  const metrics = useMemo(() => compared.map(stock => ({ stock, performance: calculatePerformance(stock.historicalData), cagr: calculateCAGR(stock.historicalData) })), [compared]);
  const lines = metrics.map(({ performance }) => {
    const points = performance.normalized.slice(-252);
    if (points.length < 2) return '';
    const values = metrics.flatMap(item => item.performance.normalized.slice(-252).map(point => point.value));
    const min = Math.min(...values); const max = Math.max(...values);
    return points.map((point, i) => `${(i / (points.length - 1)) * 100},${90 - ((point.value - min) / Math.max(max - min, 1)) * 80}`).join(' ');
  });
  const missingHistory = compared.filter(stock => stock.historicalData.length < 2).map(stock => stock.ticker);
  const hasAnyHistory = missingHistory.length < compared.length;
  const pct = (value: number, missing: boolean) => missing ? '—' : `${value.toFixed(1)}%`;

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Relative performance</p>
          <h3 className="mt-1 text-base font-semibold tracking-[-0.01em] text-ink">Compare up to three symbols</h3>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Symbols to compare">
          {stocks.map(stock => {
            const active = selected.includes(stock.ticker);
            return (
              <button
                key={stock.ticker}
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(current => active ? current.filter(t => t !== stock.ticker) : current.length < 3 ? [...current, stock.ticker] : current)}
                className="seg border-line"
              >
                {stock.ticker}
              </button>
            );
          })}
        </div>
      </div>

      {compared.length < 2 ? (
        <p className="rounded-control border border-dashed border-line-strong p-8 text-center text-sm text-ink-muted">Select at least two symbols to compare.</p>
      ) : (
        <>
          {hasAnyHistory ? (
            <>
              {missingHistory.length > 0 && <p className="mb-2 text-xs text-ink-dim">Price history unavailable for {missingHistory.join(', ')}; not plotted.</p>}
              <div className="relative h-64 overflow-hidden rounded-control border border-line p-4">
                <div className="eyebrow absolute left-4 top-3">Normalized to 100 · trailing year</div>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full pt-5" role="img" aria-label="Normalized performance comparison">
                  {lines.map((points, index) => <polyline key={compared[index].ticker} points={points} fill="none" stroke={COLORS[index]} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
                </svg>
              </div>
            </>
          ) : (
            <HistoryUnavailable className="h-64" message="Daily price history couldn't be loaded for the selected symbols, so relative performance can't be plotted. Refresh to try again." />
          )}

          <div className="mt-5 overflow-x-auto">
            <table className="data-table w-full text-ink-muted">
              <thead>
                <tr>
                  <th className="whitespace-nowrap border-b border-line px-3 py-3 text-left">Symbol</th>
                  <th className="whitespace-nowrap border-b border-line px-3 py-3">Period return</th>
                  <th className="whitespace-nowrap border-b border-line px-3 py-3">CAGR</th>
                  <th className="whitespace-nowrap border-b border-line px-3 py-3">Volatility</th>
                  <th className="whitespace-nowrap border-b border-line px-3 py-3">Max drawdown</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map(({ stock, performance, cagr }, index) => {
                  const missing = missingHistory.includes(stock.ticker);
                  return (
                    <tr key={stock.ticker}>
                      <td className="px-3">
                        <span className="inline-flex items-center gap-2">
                          <CompanyMark ticker={stock.ticker} size={24} />
                          <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: COLORS[index] }} aria-hidden="true" />
                          <span style={{ color: COLORS[index] }} className="font-medium">{stock.ticker}</span>
                        </span>
                      </td>
                      <td className={`px-3 ${missing ? 'text-ink-dim' : performance.returnPercent >= 0 ? 'text-gain' : 'text-loss'}`}>{!missing && performance.returnPercent > 0 ? '+' : ''}{pct(performance.returnPercent, missing)}</td>
                      <td className={`px-3 ${missing || !cagr ? 'text-ink-dim' : 'text-ink'}`} title={cagr ? `${cagr.startDate} to ${cagr.endDate}` : 'Needs at least one year of daily history'}>{cagr ? pct(cagr.rate * 100, missing) : '—'}</td>
                      <td className={`px-3 ${missing ? 'text-ink-dim' : 'text-ink'}`}>{pct(performance.annualizedVolatility, missing)}</td>
                      <td className={`px-3 ${missing ? 'text-ink-dim' : 'text-loss'}`}>{pct(performance.maxDrawdown, missing)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="mt-4 text-xs text-ink-dim">Historical metrics are descriptive, not predictive. Demo-series metrics are illustrative only.</p>
    </div>
  );
}
