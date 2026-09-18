import { useMemo, useState } from 'react';
import { StockInfo } from '../utils/mockData';
import { calculatePerformance } from '../utils/performance';
import { calculateCAGR } from '../utils/technicalAnalysis';
import CompanyMark from './CompanyMark';

const COLORS = ['#b7f34a', '#9b8ce8', '#e4b75c'];

export default function ComparisonPanel({ stocks }: { stocks: StockInfo[] }) {
  const [selected, setSelected] = useState(() => stocks.slice(0, 3).map(stock => stock.ticker));
  const compared = stocks.filter(stock => selected.includes(stock.ticker)).slice(0, 3);
  const metrics = useMemo(() => compared.map(stock => ({ stock, performance: calculatePerformance(stock.historicalData), cagr: calculateCAGR(stock.historicalData) * 100 })), [compared]);
  const lines = metrics.map(({ performance }, index) => {
    const points = performance.normalized.slice(-252);
    if (points.length < 2) return '';
    const values = metrics.flatMap(item => item.performance.normalized.slice(-252).map(point => point.value));
    const min = Math.min(...values); const max = Math.max(...values);
    return points.map((point, i) => `${(i / (points.length - 1)) * 100},${90 - ((point.value - min) / Math.max(max - min, 1)) * 80}`).join(' ');
  });

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] uppercase tracking-[.18em] text-[var(--text-tertiary)]">Relative performance</p><h2 className="mt-1 text-xl font-semibold text-white">Compare up to three symbols</h2></div><div className="flex flex-wrap gap-2">{stocks.map(stock => { const active = selected.includes(stock.ticker); return <button key={stock.ticker} onClick={() => setSelected(current => active ? current.filter(t => t !== stock.ticker) : current.length < 3 ? [...current, stock.ticker] : current)} className={`rounded-[7px] border px-3 py-2 text-xs ${active ? 'border-lime-300/30 bg-lime-300/[.08] text-lime-200' : 'border-white/[.1] text-[var(--text-secondary)]'}`}>{stock.ticker}</button>; })}</div></div>
      {compared.length < 2 ? <p className="rounded-[8px] border border-dashed border-white/[.12] p-8 text-center text-sm text-[var(--text-secondary)]">Select at least two symbols to compare.</p> : <>
        <div className="relative h-64 overflow-hidden rounded-[8px] border border-white/[.08] bg-black/10 p-4"><div className="absolute left-4 top-3 text-[10px] text-[var(--text-tertiary)]">Normalized to 100 · trailing year</div><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full pt-5" aria-label="Normalized performance comparison">{lines.map((points, index) => <polyline key={compared[index].ticker} points={points} fill="none" stroke={COLORS[index]} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}</svg></div>
        <div className="mt-5 overflow-x-auto"><table className="data-table w-full"><thead><tr><th className="px-3 py-3 text-left">Symbol</th><th className="px-3 py-3">Period return</th><th className="px-3 py-3">CAGR</th><th className="px-3 py-3">Volatility</th><th className="px-3 py-3">Max drawdown</th></tr></thead><tbody>{metrics.map(({ stock, performance, cagr }, index) => <tr key={stock.ticker}><td className="px-3"><span className="inline-flex items-center gap-2"><CompanyMark ticker={stock.ticker} size={24} /><span style={{ color: COLORS[index] }} className="font-semibold">{stock.ticker}</span></span></td><td className={`px-3 font-mono ${performance.returnPercent >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>{performance.returnPercent.toFixed(1)}%</td><td className="px-3 font-mono text-white">{cagr.toFixed(1)}%</td><td className="px-3 font-mono text-white">{performance.annualizedVolatility.toFixed(1)}%</td><td className="px-3 font-mono text-[var(--negative)]">{performance.maxDrawdown.toFixed(1)}%</td></tr>)}</tbody></table></div>
      </>}
      <p className="mt-4 text-[11px] text-[var(--text-tertiary)]">Historical metrics are descriptive, not predictive. Demo-series metrics are illustrative only.</p>
    </div>
  );
}
