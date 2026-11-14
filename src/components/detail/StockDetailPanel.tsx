import { lazy, useMemo } from 'react';
import { Activity, EyeOff, Layers3, LineChart, Newspaper, Pencil, Plus, TrendingUp, type LucideIcon } from 'lucide-react';
import type { StockInfo } from '../../utils/mockData';
import { analyzeStock } from '../../utils/technicalAnalysis';
import { historySignature } from '../../utils/chartData';
import { getForecastInputs } from '../../utils/forecast';
import { getHoldingMetrics } from '../../utils/portfolioMetrics';
import { getCompanyMetadata } from '../../utils/companyMetadata';
import { formatCurrency, formatShares, formatSignedCurrency, formatSignedPercent } from '../../utils/format';
import type { NewsItem } from '../../types/news';
import type { DetailTab } from '../../types/views';
import AnalysisPanel from '../AnalysisPanel';
import CompanyMark from '../CompanyMark';
import LatestNewsPanel from '../LatestNewsPanel';
import LazyPanel from '../LazyPanel';
import Delta from '../ui/Delta';
import SignalChip from '../ui/SignalChip';

// Heavy panels load on demand; each is wrapped in LazyPanel (error boundary + Suspense).
const CandlestickChart = lazy(() => import('../CandlestickChart'));
const FinancialForecaster = lazy(() => import('../FinancialForecaster'));
const ComparisonPanel = lazy(() => import('../ComparisonPanel'));

interface StockDetailPanelProps {
  selectedStock: StockInfo;
  /** All loaded stocks, for the Compare tab. */
  stocks: StockInfo[];
  /** Shares of the selected stock held in the active portfolio (0 when it is only watched). */
  quantity: number;
  averageCost: number | undefined;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  stockNews: NewsItem[];
  newsLoading: boolean;
  /** Opens the holding dialog for the selected stock. */
  onEditHolding: (ticker: string) => void;
  /** Whether the stock can be removed (a portfolio keeps at least one stock). */
  canRemove: boolean;
  onRemove: (ticker: string) => void;
}

const TABS: Array<{ value: DetailTab; label: string; Icon: LucideIcon }> = [
  { value: 'chart', label: 'Chart', Icon: LineChart },
  { value: 'analysis', label: 'Analysis', Icon: Activity },
  { value: 'forecast', label: 'Forecast', Icon: TrendingUp },
  { value: 'compare', label: 'Compare', Icon: Layers3 },
  { value: 'news', label: 'News', Icon: Newspaper },
];

/**
 * The selected stock, alongside the holdings list: quote, your position with one-click edit, and
 * tabs for Chart, Analysis, Forecast, Compare and News.
 */
export default function StockDetailPanel({
  selectedStock,
  stocks,
  quantity,
  averageCost,
  activeTab,
  onTabChange,
  stockNews,
  newsLoading,
  onEditHolding,
  canRemove,
  onRemove,
}: StockDetailPanelProps) {
  // Recompute indicators only when the history changes, so re-renders (typing in search, the quote
  // refresh) hand the chart the same object and it doesn't redraw. The signature catches the
  // refresh updating today's candle in place.
  const { historicalData, hasRealHistory } = selectedStock;
  const historyKey = historySignature(historicalData);
  const analysis = useMemo(
    () => analyzeStock(historicalData, hasRealHistory),
    [historicalData, historyKey, hasRealHistory],
  );
  const { cagr: forecastCagr, unavailableReason: forecastUnavailableReason } = getForecastInputs(selectedStock);

  const { ticker } = selectedStock;
  const held = quantity > 0;
  const position = getHoldingMetrics(selectedStock, quantity, averageCost);
  const change = selectedStock.currentPrice - selectedStock.previousClose;
  const changePercent = (change / selectedStock.previousClose) * 100;
  const editLabel = held ? `Edit ${ticker} holding` : `Add ${ticker} shares`;

  return (
    <section data-detail-panel aria-labelledby="detail-heading" className="panel flex min-w-0 flex-col p-4 sm:p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyMark ticker={ticker} size={40} className="rounded-control" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 id="detail-heading" className="num text-lg font-semibold leading-6 text-ink">{ticker}</h2>
              <SignalChip recommendation={analysis.recommendation} className="hidden sm:inline-flex" />
              <span className={`chip max-sm:h-auto max-sm:border-0 max-sm:p-0 ${selectedStock.isLiveData ? 'border-gain/35 text-gain' : 'border-warn/35 text-warn'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${selectedStock.isLiveData ? 'bg-gain' : 'bg-warn'}`} aria-hidden="true" />
                {selectedStock.isLiveData ? 'Live' : 'Demo'}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[13px] leading-5 text-ink-muted">
              {getCompanyMetadata(ticker, selectedStock.name).name}
              <span className="hidden sm:inline"> <span className="mx-1 text-ink-dim">·</span> {selectedStock.sector}</span>
            </p>
            <p className="mt-1 hidden text-[11px] leading-4 text-ink-dim md:block">
              Quote updated {new Date(selectedStock.lastUpdated).toLocaleTimeString()} · History through {historicalData[historicalData.length - 1]?.date ?? 'unavailable'} · {selectedStock.dataSource}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <div className="text-right">
            <p className="num text-[22px] font-medium leading-6 tracking-[-0.04em] text-ink sm:text-[28px] sm:leading-8">${selectedStock.currentPrice.toFixed(2)}</p>
            <Delta value={change} className="mt-0.5 justify-end text-xs sm:text-[13px]">
              {change >= 0 ? '+' : ''}{change.toFixed(2)} ({formatSignedPercent(changePercent)})
            </Delta>
          </div>
          <button type="button" onClick={() => onEditHolding(ticker)} aria-label={editLabel} title={held ? 'Edit holding' : 'Add shares'} className="icon-btn lg:hidden">
            {held ? <Pencil className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Your position. Above the tabs on wide screens; below the chart on small ones, where the
          edit button in the header keeps it one tap away. */}
      <div className="order-last mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-3 lg:order-none lg:border-b lg:py-3">
        {held ? (
          <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-[13px]">
            <div className="flex items-baseline gap-2"><dt className="eyebrow">Shares</dt><dd className="num text-ink">{formatShares(quantity)}</dd></div>
            <div className="flex items-baseline gap-2"><dt className="eyebrow">Avg cost</dt><dd className="num text-ink">${position.avgCostPerShare.toFixed(2)}</dd></div>
            <div className="flex items-baseline gap-2"><dt className="eyebrow">Value</dt><dd className="num text-ink">{formatCurrency(position.marketValue)}</dd></div>
            <div className="flex items-baseline gap-2">
              <dt className="eyebrow">Total P/L</dt>
              <dd><Delta value={position.totalGainDollar}>{formatSignedCurrency(position.totalGainDollar)} ({formatSignedPercent(position.totalGainPct)})</Delta></dd>
            </div>
          </dl>
        ) : (
          <p className="text-[13px] text-ink-muted">You&apos;re watching {ticker}. Add your shares to track its value and profit or loss.</p>
        )}
        <div className="flex items-center gap-2">
          <SignalChip recommendation={analysis.recommendation} className="sm:hidden" />
          <button type="button" onClick={() => onEditHolding(ticker)} className="btn btn-secondary btn-sm hidden lg:inline-flex">
            {held ? <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
            {held ? 'Edit holding' : 'Add shares'}
          </button>
          {canRemove && (
            <button type="button" onClick={() => onRemove(ticker)} aria-label={`Remove ${ticker} from this portfolio`} title="Remove stock" className="icon-btn icon-btn-plain icon-btn-sm text-ink-dim">
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="mobile-scroll mt-2 flex items-center gap-3 overflow-x-auto border-b border-line sm:gap-6 lg:mt-1" role="group" aria-label={`${ticker} views`}>
        {TABS.map(({ value, label, Icon }) => (
          <button key={value} type="button" onClick={() => onTabChange(value)} aria-pressed={activeTab === value} className="tab">
            <Icon className="hidden h-4 w-4 sm:block" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 lg:mt-4">
        {activeTab === 'chart' && (
          <LazyPanel resetKey={ticker}>
            <CandlestickChart
              data={historicalData}
              analysis={analysis}
              ticker={ticker}
              unavailableReason={selectedStock.historyUnavailableReason}
            />
          </LazyPanel>
        )}

        {activeTab === 'analysis' && <AnalysisPanel analysis={analysis} ticker={ticker} />}

        {activeTab === 'forecast' && (
          <LazyPanel resetKey={ticker}>
            <FinancialForecaster cagr={forecastCagr} ticker={ticker} unavailableReason={forecastUnavailableReason} />
          </LazyPanel>
        )}

        {activeTab === 'compare' && <LazyPanel><ComparisonPanel stocks={stocks} /></LazyPanel>}

        {activeTab === 'news' && <LatestNewsPanel ticker={ticker} items={stockNews} loading={newsLoading} />}
      </div>
    </section>
  );
}
