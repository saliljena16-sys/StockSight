import { lazy, useMemo } from 'react';
import { Activity, Layers3, LineChart, Loader2, TrendingUp } from 'lucide-react';
import type { StockInfo } from '../../utils/mockData';
import { analyzeStock } from '../../utils/technicalAnalysis';
import { historySignature } from '../../utils/chartData';
import { getForecastInputs } from '../../utils/forecast';
import { getCompanyMetadata } from '../../utils/companyMetadata';
import type { NewsItem } from '../../types/news';
import type { DetailTab } from '../../types/views';
import AnalysisPanel from '../AnalysisPanel';
import CompanyMark from '../CompanyMark';
import LatestNewsPanel from '../LatestNewsPanel';
import LazyPanel from '../LazyPanel';

// Heavy panels load on demand; each is wrapped in LazyPanel (error boundary + Suspense).
const CandlestickChart = lazy(() => import('../CandlestickChart'));
const FinancialForecaster = lazy(() => import('../FinancialForecaster'));
const ComparisonPanel = lazy(() => import('../ComparisonPanel'));

interface StockDetailPanelProps {
  selectedStock: StockInfo;
  /** All loaded stocks, for the Compare tab. */
  stocks: StockInfo[];
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  stockNews: NewsItem[];
  newsLoading: boolean;
}

/** The selected stock: quote header, Chart/Analysis/Forecast/Compare tabs, and its news. */
export default function StockDetailPanel({ selectedStock, stocks, activeTab, onTabChange, stockNews, newsLoading }: StockDetailPanelProps) {
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

  return (
    <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(340px,.92fr)]">
      <section className="min-w-0 rounded-[10px] border border-white/[.1] bg-[var(--surface-1)] p-4 sm:p-5 lg:p-6">
        <div className="mb-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <CompanyMark ticker={selectedStock.ticker} size={44} className="rounded-[9px]" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold tracking-[-.03em] text-white">{selectedStock.ticker}</h2>
                <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${selectedStock.isLiveData ? 'text-[var(--positive)]' : 'text-[var(--warning)]'}`}><span className={`h-2 w-2 rounded-full ${selectedStock.isLiveData ? 'bg-[var(--positive)]' : 'bg-[var(--warning)]'}`} />{selectedStock.isLiveData ? 'LIVE QUOTE' : 'DEMO SERIES'}</span>
              </div>
              <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">{getCompanyMetadata(selectedStock.ticker, selectedStock.name).name} <span className="mx-1 text-[var(--text-tertiary)]">•</span> {selectedStock.sector}</p>
              <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">Quote updated {new Date(selectedStock.lastUpdated).toLocaleTimeString()} · History through {selectedStock.historicalData[selectedStock.historicalData.length - 1]?.date ?? 'unavailable'} · {selectedStock.dataSource}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-mono text-[30px] font-medium tracking-[-.05em] text-white">${selectedStock.currentPrice.toFixed(2)}</p>
            <p className={`mt-1 font-mono text-sm font-medium ${selectedStock.currentPrice >= selectedStock.previousClose ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
              {selectedStock.currentPrice >= selectedStock.previousClose ? '+' : ''}{(selectedStock.currentPrice - selectedStock.previousClose).toFixed(2)} ({selectedStock.currentPrice >= selectedStock.previousClose ? '+' : ''}{(((selectedStock.currentPrice - selectedStock.previousClose) / selectedStock.previousClose) * 100).toFixed(2)}%)
            </p>
          </div>
        </div>

      <div className="mobile-scroll mb-5 flex items-center gap-1 overflow-x-auto border-b border-white/[.08]">
        <button
          onClick={() => onTabChange('chart')}
          aria-pressed={activeTab === 'chart'}
          className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
            activeTab === 'chart' ? 'border-lime-300 text-lime-200' : 'border-transparent text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          <LineChart className="w-4 h-4" />
          Price Chart
        </button>
        <button
          onClick={() => onTabChange('analysis')}
          aria-pressed={activeTab === 'analysis'}
          className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
            activeTab === 'analysis' ? 'border-lime-300 text-lime-200' : 'border-transparent text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          Analysis
        </button>
        <button
          onClick={() => onTabChange('forecast')}
          aria-pressed={activeTab === 'forecast'}
          className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
            activeTab === 'forecast' ? 'border-lime-300 text-lime-200' : 'border-transparent text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Forecast
        </button>
        <button
          onClick={() => onTabChange('compare')}
          aria-pressed={activeTab === 'compare'}
          className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${activeTab === 'compare' ? 'border-lime-300 text-lime-200' : 'border-transparent text-[var(--text-secondary)] hover:text-white'}`}
        >
          <Layers3 className="h-4 w-4" />Compare
        </button>
      </div>

      <div className="space-y-6">
        {activeTab === 'chart' && (
          <div>
            <div className="hidden">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-[-.03em] text-white">
                    {selectedStock.ticker} — {selectedStock.name}
                  </h2>
                  {selectedStock.isLiveData && (
                    <span className="flex items-center gap-1 text-[10px] text-[#54d99a] font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#54d99a]"></div>
                      LIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#68716a] mt-1">
                  {selectedStock.sector} • Historical Price Action
                  {selectedStock.isLiveData &&
                    ` • Last updated: ${new Date(selectedStock.lastUpdated).toLocaleTimeString()}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[28px] font-medium font-mono text-white tracking-[-.05em]">${selectedStock.currentPrice.toFixed(2)}</p>
                <p
                  className={`text-sm font-medium ${
                    selectedStock.currentPrice >= selectedStock.previousClose
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  {selectedStock.currentPrice >= selectedStock.previousClose ? '+' : ''}
                  {(selectedStock.currentPrice - selectedStock.previousClose).toFixed(2)} (
                  {(
                    ((selectedStock.currentPrice - selectedStock.previousClose) /
                      selectedStock.previousClose) *
                    100
                  ).toFixed(2)}
                  %)
                </p>
              </div>
            </div>
            <LazyPanel resetKey={selectedStock.ticker}><CandlestickChart
                data={selectedStock.historicalData}
                analysis={analysis}
                ticker={selectedStock.ticker}
                unavailableReason={selectedStock.historyUnavailableReason}
              /></LazyPanel>

            <div className="hidden">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[.16em] text-[#68716a]">Market feed</p>
                  <h3 className="text-base font-semibold text-white mt-1">Latest news</h3>
                </div>
                <span className="text-xs font-mono text-[#68716a]">{selectedStock.ticker}</span>
              </div>

              {newsLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading news...
                </div>
              ) : stockNews.length > 0 ? (
                <div className="grid md:grid-cols-2 md:gap-x-6">
                  {stockNews.map((item) => (
                    <a
                      key={`${item.source}-${item.datetime}-${item.headline}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group block border-t border-white/[.07] py-4 hover:bg-white/[.018] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.headline}
                            className="w-14 h-14 object-cover rounded-[6px] border border-white/[.08] grayscale-[25%]"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-[6px] bg-white/[.03] border border-white/[.07] flex items-center justify-center text-[9px] uppercase tracking-wider text-[#68716a]">
                            News
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] uppercase tracking-[.12em] text-[#54d99a] mb-1">
                            {item.source}
                          </div>
                          <h4 className="text-sm font-medium leading-5 text-[#e7eae7] group-hover:text-white line-clamp-2">{item.headline}</h4>
                          <p className="mt-1 text-xs leading-4 text-[#68716a] line-clamp-2">{item.summary}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No recent company news is available for {selectedStock.ticker} right now.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <AnalysisPanel analysis={analysis} ticker={selectedStock.ticker} />
        )}

        {activeTab === 'forecast' && (
          <LazyPanel resetKey={selectedStock.ticker}><FinancialForecaster
            cagr={forecastCagr}
            ticker={selectedStock.ticker}
            unavailableReason={forecastUnavailableReason}
          /></LazyPanel>
        )}
        {activeTab === 'compare' && <LazyPanel><ComparisonPanel stocks={stocks} /></LazyPanel>}
      </div>
      </section>
      <LatestNewsPanel ticker={selectedStock.ticker} items={stockNews} loading={newsLoading} />
    </div>
  );
}
