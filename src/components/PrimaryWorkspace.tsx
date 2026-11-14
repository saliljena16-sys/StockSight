import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, ExternalLink, Newspaper, PieChart, Search, ShieldCheck } from 'lucide-react';
import { StockInfo } from '../utils/mockData';
import { analyzeStock } from '../utils/technicalAnalysis';
import { annualizedVolatility30d as volatility, dayChangePercent as changePercent, returnToCurrentPrice as periodReturn } from '../utils/marketMetrics';
import { formatSignedPercent } from '../utils/format';
import type { NewsItem } from '../types/news';
import CompanyMark from './CompanyMark';
import Delta from './ui/Delta';
import SignalChip from './ui/SignalChip';

interface PrimaryWorkspaceProps {
  view: 'insights' | 'news';
  stocks: StockInfo[];
  /** True while the first quotes load: placeholders are shown instead of empty states. */
  loading: boolean;
  quantities: Record<string, number>;
  totalValue: number;
  cash: number;
  onInspect: (ticker: string) => void;
}

const ViewHeading = ({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) => (
  <div className="mb-6 flex flex-col gap-4 pt-6 sm:flex-row sm:items-end sm:justify-between lg:pt-9">
    <div>
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-ink sm:text-4xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">{description}</p>
    </div>
    {children}
  </div>
);

const Tile = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="panel p-4 sm:p-5">
    <p className="eyebrow">{label}</p>
    <p className="num mt-2 text-xl text-ink">{children}</p>
  </div>
);

/** Signals: market pulse, the signal screener, today's leaders and the sector tape. */
function SignalsView({ stocks, onInspect }: Pick<PrimaryWorkspaceProps, 'stocks' | 'onInspect'>) {
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

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Tile label="Breadth"><span className={advancing >= stocks.length / 2 ? 'text-gain' : 'text-loss'}>{advancing}/{stocks.length} advancing</span></Tile>
        <Tile label="Average move"><Delta value={averageMove}>{formatSignedPercent(averageMove)}</Delta></Tile>
        <Tile label="Combined volume">{totalVolume >= 1e6 ? `${(totalVolume / 1e6).toFixed(1)}M` : totalVolume.toLocaleString()}</Tile>
      </div>

      <section className="panel mb-4 overflow-hidden" aria-label="Signal screener">
        <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden="true" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter symbol, company, or sector" aria-label="Filter symbol, company, or sector" className="field pl-10" />
          </label>
          <select value={signal} onChange={event => setSignal(event.target.value as typeof signal)} aria-label="Signal" className="field md:w-auto">
            <option value="all">All signals</option>
            <option value="bullish">Buy signals</option>
            <option value="bearish">Sell signals</option>
          </select>
          <select value={sort} onChange={event => setSort(event.target.value as typeof sort)} aria-label="Sort by" className="field md:w-auto">
            <option value="signal">Strongest signal</option>
            <option value="momentum">1M momentum</option>
            <option value="volume">Volume</option>
          </select>
        </div>
        <div className="flex items-center justify-between px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-ink">Matches</h3>
          <span className="eyebrow">{results.length} symbols</span>
        </div>
        <div className="overflow-x-auto border-t border-line">
          <table className="data-table min-w-full">
            <thead>
              <tr>{['Symbol', 'Signal', 'Confidence', '1M momentum', '30D volatility', 'Volume', ''].map(label => <th key={label} className="whitespace-nowrap border-b border-line px-4 py-3">{label}</th>)}</tr>
            </thead>
            <tbody>
              {results.map(({ stock, analysis, momentum }) => (
                <tr key={stock.ticker}>
                  <td className="px-4 py-2 !text-left">
                    <span className="flex items-center gap-3">
                      <CompanyMark ticker={stock.ticker} size={28} />
                      <span>
                        <b className="block font-medium text-ink">{stock.ticker}</b>
                        <span className="font-sans text-xs text-ink-dim">{stock.sector}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2"><SignalChip recommendation={analysis.recommendation} /></td>
                  <td className="px-4 py-2 text-ink">{analysis.confidence}%</td>
                  <td className="px-4 py-2"><Delta value={momentum}>{formatSignedPercent(momentum)}</Delta></td>
                  <td className="px-4 py-2 text-ink-muted">{volatility(stock).toFixed(1)}%</td>
                  <td className="px-4 py-2 text-ink-muted">{stock.volume.toLocaleString()}</td>
                  <td className="px-4 py-2"><button type="button" onClick={() => onInspect(stock.ticker)} className="btn btn-secondary btn-sm font-sans">Inspect</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 0 && <p className="p-10 text-center text-sm text-ink-muted">No symbols match those filters.</p>}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_.85fr]">
        <section className="panel overflow-hidden">
          <div className="border-b border-line px-4 py-4 sm:px-5">
            <h3 className="text-sm font-semibold text-ink">Leader board</h3>
            <p className="mt-1 text-xs text-ink-dim">Ranked by today&apos;s move</p>
          </div>
          <div className="divide-y divide-line">
            {ranked.map((stock, index) => {
              const move = changePercent(stock);
              return (
                <button key={stock.ticker} type="button" onClick={() => onInspect(stock.ticker)} className="grid min-h-14 w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5 text-left hover:bg-raised sm:grid-cols-[28px_1fr_auto_auto] sm:gap-3 sm:px-5">
                  <span className="num text-xs text-ink-dim">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <CompanyMark ticker={stock.ticker} size={28} />
                    <span className="min-w-0">
                      <span className="num block text-sm font-medium text-ink">{stock.ticker}</span>
                      <span className="block truncate text-xs text-ink-dim">{stock.sector}</span>
                    </span>
                  </span>
                  <span className="num hidden text-sm text-ink sm:block">${stock.currentPrice.toFixed(2)}</span>
                  <Delta value={move} className="justify-end text-sm sm:min-w-24">{formatSignedPercent(move)}</Delta>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel p-4 sm:p-5">
          <h3 className="mb-5 text-sm font-semibold text-ink">Sector tape</h3>
          <div className="space-y-4">
            {sectors.map(sector => (
              <div key={sector.name}>
                <div className="mb-1.5 flex justify-between gap-3 text-xs">
                  <span className="truncate text-ink-muted">{sector.name}</span>
                  <Delta value={sector.change}>{formatSignedPercent(sector.change)}</Delta>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-raised">
                  <div className={`h-full rounded-full ${sector.change >= 0 ? 'bg-gain' : 'bg-loss'}`} style={{ width: `${Math.min(100, Math.max(8, Math.abs(sector.change) * 18))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

/** Risk: how concentrated and how volatile the portfolio is. */
function RiskView({ stocks, quantities, totalValue, cash, onInspect }: Omit<PrimaryWorkspaceProps, 'view' | 'loading'>) {
  const holdings = stocks.map(stock => ({ stock, value: stock.currentPrice * (quantities[stock.ticker] ?? 0) })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  const invested = Math.max(0, totalValue - cash);
  const weightedVolatility = invested > 0 ? holdings.reduce((sum, item) => sum + volatility(item.stock) * item.value / invested, 0) : 0;
  const largestWeight = totalValue > 0 ? (holdings[0]?.value ?? 0) / totalValue * 100 : 0;
  const diversification = Math.max(0, 100 - holdings.reduce((sum, item) => sum + ((item.value / Math.max(invested, 1)) * 100) ** 2, 0) / 100);

  if (holdings.length === 0) {
    return (
      <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full border border-line"><PieChart className="h-4 w-4 text-ink-dim" aria-hidden="true" /></span>
        <h3 className="text-base font-semibold text-ink">No holdings to analyse yet</h3>
        <p className="max-w-md text-sm leading-6 text-ink-muted">Add share quantities to see allocation analytics: how concentrated your portfolio is, how volatile it has been, and a diversification score.</p>
      </div>
    );
  }

  const ringLength = 2 * Math.PI * 52;
  const ringShown = Math.min(100, diversification) / 100;

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile label="Invested">${invested.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Tile>
        <Tile label="Cash reserve">{totalValue > 0 ? `${(cash / totalValue * 100).toFixed(1)}%` : '0.0%'}</Tile>
        <Tile label="Largest position">{largestWeight.toFixed(1)}%</Tile>
        <Tile label="Weighted volatility">{weightedVolatility.toFixed(1)}%</Tile>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.35fr_.85fr]">
        <section className="panel p-4 sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink">Position concentration</h3>
            <span className="eyebrow">Share of portfolio value</span>
          </div>
          <div className="space-y-1">
            {holdings.map(({ stock, value }) => {
              const weight = totalValue > 0 ? value / totalValue * 100 : 0;
              return (
                <button key={stock.ticker} type="button" onClick={() => onInspect(stock.ticker)} className="block w-full rounded-control px-2 py-2.5 text-left hover:bg-raised">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="num flex items-center gap-2 text-sm font-medium text-ink"><CompanyMark ticker={stock.ticker} size={22} />{stock.ticker}</span>
                    <span className="num text-xs text-ink-muted">{weight.toFixed(1)}% · ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(1, weight)}%` }} /></div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-ink">Risk check</h3>
          <div className="relative mx-auto my-6 h-36 w-36">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" className="stroke-raised" />
              <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray={ringLength} strokeDashoffset={ringLength * (1 - ringShown)} className="stroke-accent" />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="num text-3xl text-ink">{diversification.toFixed(0)}</p>
                <p className="eyebrow mt-1">diversification</p>
              </div>
            </div>
          </div>
          <div className="space-y-3 border-t border-line pt-4 text-sm leading-6">
            {largestWeight > 40
              ? <p className="flex gap-2 text-warn"><AlertTriangle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />One position represents over 40% of the portfolio.</p>
              : <p className="flex gap-2 text-gain"><ShieldCheck className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />No single position crosses the 40% concentration threshold.</p>}
            <p className="text-xs leading-5 text-ink-dim">This is a descriptive risk view, not investment advice.</p>
          </div>
        </section>
      </div>
    </>
  );
}

/** Insights: the old Markets and Screeners views (Signals) and Analytics (Risk) under one roof. */
function InsightsView({ stocks, loading, quantities, totalValue, cash, onInspect }: Omit<PrimaryWorkspaceProps, 'view'>) {
  const [section, setSection] = useState<'signals' | 'risk'>('signals');

  return (
    <>
      <ViewHeading
        eyebrow="Insights"
        title={section === 'signals' ? 'Signals and movers' : 'Risk and allocation'}
        description={section === 'signals'
          ? 'Breadth, leadership and technical signals across the symbols in this portfolio. Search, filter and rank them, then inspect one.'
          : 'A decision layer focused on concentration and volatility, not another holdings table.'}
      >
        <div className="flex shrink-0 self-start rounded-full border border-line p-1 sm:self-auto" role="group" aria-label="Insights section">
          <button type="button" className="seg" aria-pressed={section === 'signals'} onClick={() => setSection('signals')}>Signals</button>
          <button type="button" className="seg" aria-pressed={section === 'risk'} onClick={() => setSection('risk')}>Risk</button>
        </div>
      </ViewHeading>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3" aria-busy="true" aria-label="Loading insights">
          {[0, 1, 2].map(index => <div key={index} className="skeleton h-24" />)}
          <div className="skeleton h-72 sm:col-span-3" />
        </div>
      ) : stocks.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-line"><Search className="h-4 w-4 text-ink-dim" aria-hidden="true" /></span>
          <h3 className="text-base font-semibold text-ink">Nothing to analyse yet</h3>
          <p className="max-w-md text-sm leading-6 text-ink-muted">This portfolio has no symbols. Add one on the Portfolio tab and its signals, movers and risk appear here.</p>
        </div>
      ) : section === 'signals' ? (
        <SignalsView stocks={stocks} onInspect={onInspect} />
      ) : (
        <RiskView stocks={stocks} quantities={quantities} totalValue={totalValue} cash={cash} onInspect={onInspect} />
      )}
    </>
  );
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

  return (
    <>
      <ViewHeading eyebrow="News desk" title="The market, beyond one ticker" description="A broad market feed for context and catalysts. Company-specific stories are in each stock's News tab on the Portfolio screen." />
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading the latest coverage">
          <div className="skeleton h-80 md:col-span-2" />
          {[0, 1, 2, 3].map(index => <div key={index} className="skeleton h-80" />)}
        </div>
      ) : error || items.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-line"><Newspaper className="h-4 w-4 text-ink-dim" aria-hidden="true" /></span>
          <h3 className="text-base font-semibold text-ink">Market news needs a live data key</h3>
          <p className="max-w-lg text-sm leading-6 text-ink-muted">Add a Finnhub API key to <code className="rounded-[5px] bg-raised px-1.5 py-0.5 font-mono text-xs text-ink">VITE_FINNHUB_API_KEY</code> to populate this desk. Stock research and demo analytics continue to work without it.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <a key={`${item.datetime}-${item.headline}`} href={item.url} target="_blank" rel="noreferrer" className={`panel group overflow-hidden hover:border-line-strong ${index === 0 ? 'md:col-span-2' : ''}`}>
              {item.image && <img src={item.image} alt="" loading="lazy" className={`w-full object-cover opacity-85 transition-opacity group-hover:opacity-100 ${index === 0 ? 'h-56' : 'h-36'}`} />}
              <div className="p-5">
                <div className="eyebrow mb-3 flex items-center justify-between gap-3">
                  <span className="truncate">{item.source || 'Market news'}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </div>
                <h3 className={`${index === 0 ? 'text-xl' : 'text-base'} font-semibold leading-snug tracking-[-0.015em] text-ink`}>{item.headline}</h3>
                {item.summary && <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-muted">{item.summary}</p>}
                <time className="num mt-4 block text-xs text-ink-dim">{new Date(item.datetime * 1000).toLocaleString()}</time>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  );
}

export default function PrimaryWorkspace(props: PrimaryWorkspaceProps) {
  if (props.view === 'news') return <NewsView />;
  return <InsightsView stocks={props.stocks} loading={props.loading} quantities={props.quantities} totalValue={props.totalValue} cash={props.cash} onInspect={props.onInspect} />;
}
