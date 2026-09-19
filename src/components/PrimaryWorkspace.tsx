import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, ExternalLink, Filter, Gauge, Layers3, Newspaper, Search } from 'lucide-react';
import { StockInfo } from '../utils/mockData';
import { analyzeStock } from '../utils/technicalAnalysis';
import CompanyMark from './CompanyMark';

export type PrimaryView = 'watchlist' | 'markets' | 'screeners' | 'news' | 'analytics';

type NewsItem = { headline: string; summary: string; url: string; source: string; datetime: number; image?: string };

interface PrimaryWorkspaceProps {
  view: Exclude<PrimaryView, 'watchlist'>;
  stocks: StockInfo[];
  quantities: Record<string, number>;
  totalValue: number;
  cash: number;
  onInspect: (ticker: string) => void;
}

const Panel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-[10px] border border-white/[.1] bg-[var(--surface-1)] ${className}`}>{children}</section>
);

const changePercent = (stock: StockInfo) => stock.previousClose > 0
  ? ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100
  : 0;

const periodReturn = (stock: StockInfo, sessions: number) => {
  const points = stock.historicalData;
  if (points.length < 2) return 0;
  const start = points[Math.max(0, points.length - 1 - sessions)]?.close;
  return start ? ((stock.currentPrice - start) / start) * 100 : 0;
};

const volatility = (stock: StockInfo) => {
  const closes = stock.historicalData.slice(-31).map(point => point.close);
  if (closes.length < 3) return 0;
  const returns = closes.slice(1).map((close, index) => (close - closes[index]) / closes[index]);
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
};

const ViewHeading = ({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) => (
  <div className="mb-6">
    <p className="mb-1.5 text-[10px] uppercase tracking-[.2em] text-lime-300/75">{eyebrow}</p>
    <h2 className="text-2xl font-semibold tracking-[-.04em] text-white">{title}</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
  </div>
);

function MarketsView({ stocks, onInspect }: Pick<PrimaryWorkspaceProps, 'stocks' | 'onInspect'>) {
  const ranked = useMemo(() => [...stocks].sort((a, b) => changePercent(b) - changePercent(a)), [stocks]);
  const advancing = stocks.filter(stock => changePercent(stock) >= 0).length;
  const averageMove = stocks.length ? stocks.reduce((sum, stock) => sum + changePercent(stock), 0) / stocks.length : 0;
  const totalVolume = stocks.reduce((sum, stock) => sum + stock.volume, 0);
  const sectors = Object.entries(stocks.reduce<Record<string, { total: number; count: number }>>((map, stock) => {
    const key = stock.sector || 'Unknown';
    map[key] = map[key] ?? { total: 0, count: 0 };
    map[key].total += changePercent(stock);
    map[key].count += 1;
    return map;
  }, {})).map(([name, value]) => ({ name, change: value.total / value.count })).sort((a, b) => b.change - a.change);

  return <>
    <ViewHeading eyebrow="Market pulse" title="What is moving today" description="A compact read on breadth, leadership, and sector direction across the symbols currently in your workspace." />
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      {[
        { label: 'Breadth', value: `${advancing}/${stocks.length} advancing`, icon: Activity, tone: advancing >= stocks.length / 2 ? 'text-[var(--positive)]' : 'text-[var(--negative)]' },
        { label: 'Average move', value: `${averageMove >= 0 ? '+' : ''}${averageMove.toFixed(2)}%`, icon: Gauge, tone: averageMove >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]' },
        { label: 'Combined volume', value: totalVolume >= 1e6 ? `${(totalVolume / 1e6).toFixed(1)}M` : totalVolume.toLocaleString(), icon: BarChart3, tone: 'text-white' },
      ].map(item => <Panel key={item.label} className="p-5"><item.icon className="mb-5 h-4 w-4 text-lime-300/70" /><p className="text-xs text-[var(--text-tertiary)]">{item.label}</p><p className={`mt-1 font-mono text-xl ${item.tone}`}>{item.value}</p></Panel>)}
    </div>
    <div className="grid gap-4 lg:grid-cols-[1.35fr_.85fr]">
      <Panel className="overflow-hidden">
        <div className="border-b border-white/[.07] px-5 py-4"><h3 className="font-semibold text-white">Leader board</h3><p className="mt-1 text-xs text-[var(--text-tertiary)]">Ranked by today&apos;s move</p></div>
        <div className="divide-y divide-white/[.06]">{ranked.map((stock, index) => { const move = changePercent(stock); return <button key={stock.ticker} onClick={() => onInspect(stock.ticker)} className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 text-left hover:bg-white/[.035] sm:grid-cols-[28px_1fr_auto_auto] sm:gap-3 sm:px-5"><span className="font-mono text-xs text-[var(--text-tertiary)]">{String(index + 1).padStart(2, '0')}</span><span className="flex min-w-0 items-center gap-2 sm:gap-3"><CompanyMark ticker={stock.ticker} size={28} /><span className="min-w-0"><span className="block text-sm font-semibold text-white">{stock.ticker}</span><span className="block truncate text-[11px] text-[var(--text-tertiary)]">{stock.sector}</span></span></span><span className="hidden font-mono text-sm text-white sm:block">${stock.currentPrice.toFixed(2)}</span><span className={`text-right font-mono text-sm sm:min-w-20 ${move >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>{move >= 0 ? '+' : ''}{move.toFixed(2)}%</span></button>})}</div>
      </Panel>
      <Panel className="p-5"><div className="mb-5 flex items-center gap-2"><Layers3 className="h-4 w-4 text-lime-300/70" /><h3 className="font-semibold text-white">Sector tape</h3></div><div className="space-y-4">{sectors.map(sector => <div key={sector.name}><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="truncate text-[var(--text-secondary)]">{sector.name}</span><span className={sector.change >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}>{sector.change >= 0 ? '+' : ''}{sector.change.toFixed(2)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]"><div className={`h-full rounded-full ${sector.change >= 0 ? 'bg-[var(--positive)]' : 'bg-[var(--negative)]'}`} style={{ width: `${Math.min(100, Math.max(8, Math.abs(sector.change) * 18))}%` }} /></div></div>)}</div></Panel>
    </div>
  </>;
}

function ScreenersView({ stocks, onInspect }: Pick<PrimaryWorkspaceProps, 'stocks' | 'onInspect'>) {
  const [query, setQuery] = useState('');
  const [signal, setSignal] = useState<'all' | 'bullish' | 'bearish'>('all');
  const [sort, setSort] = useState<'signal' | 'momentum' | 'volume'>('signal');
  const results = useMemo(() => stocks.map(stock => {
    const analysis = analyzeStock(stock.historicalData, stock.hasRealHistory);
    const direction = analysis.recommendation.includes('BUY') ? 1 : analysis.recommendation.includes('SELL') ? -1 : 0;
    return { stock, analysis, signalScore: direction * analysis.confidence, momentum: periodReturn(stock, 21) };
  }).filter(row => {
    const matchesQuery = `${row.stock.ticker} ${row.stock.name} ${row.stock.sector}`.toLowerCase().includes(query.toLowerCase());
    const recommendation = row.analysis.recommendation.toLowerCase();
    const matchesSignal = signal === 'all' || (signal === 'bullish' ? recommendation.includes('buy') : recommendation.includes('sell'));
    return matchesQuery && matchesSignal;
  }).sort((a, b) => sort === 'momentum' ? b.momentum - a.momentum : sort === 'volume' ? b.stock.volume - a.stock.volume : b.signalScore - a.signalScore), [stocks, query, signal, sort]);

  return <>
    <ViewHeading eyebrow="Discovery" title="Signal screener" description="Turn technical signals into a focused shortlist. Search, filter, and rank your universe without duplicating the portfolio table." />
    <Panel className="mb-4 p-4"><div className="grid gap-3 md:grid-cols-[1fr_auto_auto]"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter symbol, company, or sector" className="h-10 w-full rounded-[7px] border border-white/[.1] bg-black/20 pl-10 pr-3 text-sm text-white outline-none focus:border-lime-300/40" /></label><select value={signal} onChange={event => setSignal(event.target.value as typeof signal)} className="h-10 rounded-[7px] border border-white/[.1] bg-[#101719] px-3 text-sm text-white"><option value="all">All signals</option><option value="bullish">Buy signals</option><option value="bearish">Sell signals</option></select><select value={sort} onChange={event => setSort(event.target.value as typeof sort)} className="h-10 rounded-[7px] border border-white/[.1] bg-[#101719] px-3 text-sm text-white"><option value="signal">Strongest signal</option><option value="momentum">1M momentum</option><option value="volume">Volume</option></select></div></Panel>
    <Panel className="overflow-hidden"><div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4"><span className="flex items-center gap-2 text-sm font-medium text-white"><Filter className="h-4 w-4 text-lime-300/70" />Matches</span><span className="font-mono text-xs text-[var(--text-tertiary)]">{results.length} symbols</span></div><div className="overflow-x-auto"><table className="data-table min-w-full"><thead><tr>{['Symbol', 'Signal', 'Confidence', '1M momentum', '30D volatility', 'Volume', ''].map(label => <th key={label} className="border-b border-white/[.07] px-4 py-3">{label}</th>)}</tr></thead><tbody>{results.map(({ stock, analysis, momentum }) => <tr key={stock.ticker} className="hover:bg-white/[.035]"><td className="px-4 py-3 !text-left"><span className="flex items-center gap-3"><CompanyMark ticker={stock.ticker} size={26} /><span><b className="block text-white">{stock.ticker}</b><span className="text-[11px] text-[var(--text-tertiary)]">{stock.sector}</span></span></span></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${analysis.recommendation.toLowerCase().includes('buy') ? 'bg-emerald-400/10 text-emerald-300' : analysis.recommendation.toLowerCase().includes('sell') ? 'bg-red-400/10 text-red-300' : 'bg-white/[.06] text-[var(--text-secondary)]'}`}>{analysis.recommendation}</span></td><td className="px-4 py-3 font-mono text-white">{analysis.confidence}%</td><td className={`px-4 py-3 font-mono ${momentum >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>{momentum >= 0 ? '+' : ''}{momentum.toFixed(2)}%</td><td className="px-4 py-3 font-mono text-[var(--text-secondary)]">{volatility(stock).toFixed(1)}%</td><td className="px-4 py-3 font-mono text-[var(--text-secondary)]">{stock.volume.toLocaleString()}</td><td className="px-4 py-3"><button onClick={() => onInspect(stock.ticker)} className="whitespace-nowrap rounded-[6px] border border-white/[.1] px-3 py-1.5 text-xs text-white hover:bg-white/[.06]">Inspect</button></td></tr>)}</tbody></table>{results.length === 0 && <p className="p-10 text-center text-sm text-[var(--text-tertiary)]">No symbols match those filters.</p>}</div></Panel>
  </>;
}

function NewsView() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const token = import.meta.env.VITE_FINNHUB_API_KEY;
    if (!token) { setLoading(false); setError(true); return; }
    let active = true;
    fetch(`https://finnhub.io/api/v1/news?category=general&token=${token}`).then(response => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    }).then(data => { if (active) setItems(Array.isArray(data) ? data.slice(0, 12) : []); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <>
    <ViewHeading eyebrow="News desk" title="The market, beyond one ticker" description="A broad market feed for context and catalysts. Company-specific stories remain in the Watchlist research panel." />
    {loading ? <Panel className="grid min-h-64 place-items-center"><span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Activity className="h-4 w-4 animate-pulse" />Loading the latest coverage…</span></Panel> : error || items.length === 0 ? <Panel className="p-10 text-center"><Newspaper className="mx-auto mb-4 h-7 w-7 text-lime-300/60" /><h3 className="font-semibold text-white">Market news needs a live data key</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">Add a Finnhub API key to <code className="rounded bg-white/[.06] px-1.5 py-0.5 text-xs">VITE_FINNHUB_API_KEY</code> to populate this desk. Stock research and demo analytics continue to work without it.</p></Panel> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item, index) => <a key={`${item.datetime}-${item.headline}`} href={item.url} target="_blank" rel="noreferrer" className={`group overflow-hidden rounded-[10px] border border-white/[.1] bg-[var(--surface-1)] hover:border-white/[.2] ${index === 0 ? 'md:col-span-2' : ''}`}>{item.image && <img src={item.image} alt="" className={`w-full object-cover opacity-80 transition-opacity group-hover:opacity-100 ${index === 0 ? 'h-56' : 'h-36'}`} />}<div className="p-5"><div className="mb-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[.12em] text-lime-300/70"><span>{item.source || 'Market news'}</span><ExternalLink className="h-3.5 w-3.5" /></div><h3 className={`${index === 0 ? 'text-xl' : 'text-base'} font-semibold leading-snug text-white`}>{item.headline}</h3>{item.summary && <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{item.summary}</p>}<time className="mt-4 block text-xs text-[var(--text-tertiary)]">{new Date(item.datetime * 1000).toLocaleString()}</time></div></a>)}</div>}
  </>;
}

function AnalyticsView({ stocks, quantities, totalValue, cash, onInspect }: Omit<PrimaryWorkspaceProps, 'view'>) {
  const holdings = stocks.map(stock => ({ stock, value: stock.currentPrice * (quantities[stock.ticker] ?? 0) })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  const invested = Math.max(0, totalValue - cash);
  const weightedVolatility = invested > 0 ? holdings.reduce((sum, item) => sum + volatility(item.stock) * item.value / invested, 0) : 0;
  const largestWeight = totalValue > 0 ? (holdings[0]?.value ?? 0) / totalValue * 100 : 0;
  const diversification = Math.max(0, 100 - holdings.reduce((sum, item) => sum + ((item.value / Math.max(invested, 1)) * 100) ** 2, 0) / 100);
  return <>
    <ViewHeading eyebrow="Portfolio intelligence" title="Risk and allocation" description="A decision layer focused on concentration and volatility—not another holdings table." />
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: 'Invested', value: `$${invested.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
      { label: 'Cash reserve', value: totalValue > 0 ? `${(cash / totalValue * 100).toFixed(1)}%` : '0.0%' },
      { label: 'Largest position', value: `${largestWeight.toFixed(1)}%` },
      { label: 'Weighted volatility', value: `${weightedVolatility.toFixed(1)}%` },
    ].map(item => <Panel key={item.label} className="p-5"><p className="text-xs text-[var(--text-tertiary)]">{item.label}</p><p className="mt-2 font-mono text-xl text-white">{item.value}</p></Panel>)}</div>
    <div className="grid gap-4 lg:grid-cols-[1.35fr_.85fr]">
      <Panel className="p-5"><div className="mb-6 flex items-center justify-between"><h3 className="font-semibold text-white">Position concentration</h3><span className="text-xs text-[var(--text-tertiary)]">Share of portfolio value</span></div><div className="space-y-5">{holdings.map(({ stock, value }) => { const weight = totalValue > 0 ? value / totalValue * 100 : 0; return <button key={stock.ticker} onClick={() => onInspect(stock.ticker)} className="block w-full text-left"><div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-semibold text-white"><CompanyMark ticker={stock.ticker} size={22} />{stock.ticker}</span><span className="font-mono text-xs text-[var(--text-secondary)]">{weight.toFixed(1)}% · ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-lime-300" style={{ width: `${Math.max(1, weight)}%` }} /></div></button>})}{holdings.length === 0 && <p className="py-10 text-center text-sm text-[var(--text-tertiary)]">Add share quantities to see allocation analytics.</p>}</div></Panel>
      <Panel className="p-5"><h3 className="font-semibold text-white">Risk check</h3><div className="my-7 grid place-items-center"><div className="grid h-36 w-36 place-items-center rounded-full border-[10px] border-lime-300/15" style={{ borderTopColor: 'var(--accent)', transform: `rotate(${Math.min(90, diversification) * 1.8 - 90}deg)` }}><div className="text-center" style={{ transform: `rotate(${-Math.min(90, diversification) * 1.8 + 90}deg)` }}><p className="font-mono text-2xl text-white">{diversification.toFixed(0)}</p><p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">diversification</p></div></div></div><div className="space-y-3 border-t border-white/[.07] pt-4 text-sm">{largestWeight > 40 ? <p className="flex gap-2 text-amber-200"><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0" />One position represents over 40% of the portfolio.</p> : <p className="flex gap-2 text-emerald-200"><ArrowDownRight className="mt-0.5 h-4 w-4 shrink-0" />No single position crosses the 40% concentration threshold.</p>}<p className="text-xs leading-5 text-[var(--text-tertiary)]">This is a descriptive risk view, not investment advice.</p></div></Panel>
    </div>
  </>;
}

export default function PrimaryWorkspace(props: PrimaryWorkspaceProps) {
  if (props.view === 'markets') return <MarketsView stocks={props.stocks} onInspect={props.onInspect} />;
  if (props.view === 'screeners') return <ScreenersView stocks={props.stocks} onInspect={props.onInspect} />;
  if (props.view === 'news') return <NewsView />;
  return <AnalyticsView {...props} />;
}
