import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { getStockInfo, simulatePriceUpdate, STARTER_STOCKS, StockInfo } from './utils/mockData';
import { analyzeStock, calculateCAGR } from './utils/technicalAnalysis';
import StockCard from './components/StockCard';
import CandlestickChart from './components/CandlestickChart';
import AnalysisPanel from './components/AnalysisPanel';
import FinancialForecaster from './components/FinancialForecaster';
import AddStockModal from './components/AddStockModal';
import { BarChart3, Plus, RefreshCw, Activity, TrendingUp, Clock, Zap, EyeOff, Wifi, WifiOff, Loader2 } from 'lucide-react';

const fetcher = async (ticker: string): Promise<StockInfo> => {
  return getStockInfo(ticker);
};

export default function App() {
  const [tickers, setTickers] = useState<string[]>(STARTER_STOCKS);
  const [selectedTicker, setSelectedTicker] = useState<string>(STARTER_STOCKS[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'chart' | 'analysis' | 'forecast'>('chart');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: stocksData, isLoading, mutate } = useSWR(
    tickers.length > 0 ? tickers : null,
    async (keys: string[]) => {
      const results = await Promise.all(keys.map(k => fetcher(k)));
      setLastUpdate(new Date());
      return results;
    },
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      revalidateIfStale: true,
    }
  );

  const hasLiveData = stocksData?.some(s => s.isLiveData) ?? false;
  const allLiveData = stocksData?.every(s => s.isLiveData) ?? false;

  useEffect(() => {
    const interval = setInterval(() => {
      if (stocksData) {
        mutate(
          stocksData.map(stock => simulatePriceUpdate(stock)),
          { revalidate: false }
        );
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [stocksData, mutate]);

  const addStock = (ticker: string) => {
    const upper = ticker.toUpperCase();
    if (!tickers.includes(upper)) {
      setTickers(prev => [...prev, upper]);
      setSelectedTicker(upper);
    }
  };

  const removeStock = (ticker: string) => {
    setTickers(prev => {
      const next = prev.filter(t => t !== ticker);
      if (selectedTicker === ticker && next.length > 0) {
        setSelectedTicker(next[0]);
      }
      return next;
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
  };

  const selectedStock = stocksData?.find(s => s.ticker === selectedTicker);
  const analysis = selectedStock ? analyzeStock(selectedStock.historicalData) : null;
  const cagr = selectedStock ? calculateCAGR(selectedStock.historicalData) : 0.10;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2 rounded-lg">
                <BarChart3 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">StockSight</h1>
                <p className="text-xs text-slate-500">Real-Time Algorithmic Analysis</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border bg-slate-800/50">
                {hasLiveData ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span className={allLiveData ? 'text-emerald-400' : 'text-amber-400'}>
                      {allLiveData ? 'Live Market Data' : 'Partial Live Data'}
                    </span>
                    {selectedStock && (
                      <span className="text-slate-500">via {selectedStock.dataSource}</span>
                    )}
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                    <span className="text-blue-400">Fetching from APIs...</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-500" />
                    <span className="text-amber-400">Demo Mode — APIs unavailable</span>
                  </>
                )}
              </div>

              <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <Clock className="w-3 h-3" />
                <span>{lastUpdate.toLocaleTimeString()}</span>
              </div>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Stock</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {isLoading && !stocksData && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">Fetching Live Market Data</h2>
            <p className="text-slate-400 text-sm">Connecting to APIs...</p>
          </div>
        )}

        {stocksData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {stocksData.map((stock) => {
              const stockAnalysis = analyzeStock(stock.historicalData);
              return (
                <div key={stock.ticker} className="relative group">
                  <StockCard
                    stock={stock}
                    analysis={stockAnalysis}
                    isSelected={stock.ticker === selectedTicker}
                    onClick={() => setSelectedTicker(stock.ticker)}
                  />
                  {stock.isLiveData ? (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-[10px] text-emerald-400 font-medium">LIVE • {stock.dataSource}</span>
                    </div>
                  ) : (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                      <span className="text-[10px] text-amber-400 font-medium">DEMO MODE</span>
                    </div>
                  )}
                  {tickers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStock(stock.ticker);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-slate-700/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                      title="Remove stock"
                    >
                      <EyeOff className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => setShowAddModal(true)}
              className="p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/30 transition-all flex flex-col items-center justify-center gap-2 min-h-[120px]"
            >
              <Plus className="w-6 h-6 text-slate-500" />
              <span className="text-sm text-slate-500">Add Stock</span>
            </button>
          </div>
        )}

        {selectedStock && analysis && (
          <>
            <div className="flex items-center gap-1 mb-4 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50 w-fit">
              <button
                onClick={() => setActiveTab('chart')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'chart' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                Price Chart
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'analysis' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4" />
                Analysis
              </button>
              <button
                onClick={() => setActiveTab('forecast')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'forecast' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Forecast
              </button>
            </div>

            <div className="space-y-6">
              {activeTab === 'chart' && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">
                          {selectedStock.ticker} — {selectedStock.name}
                        </h2>
                        {selectedStock.isLiveData && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                            LIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {selectedStock.sector} • 1 Year Price Action
                        {selectedStock.isLiveData &&
                          ` • Last updated: ${new Date(selectedStock.lastUpdated).toLocaleTimeString()}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">${selectedStock.currentPrice.toFixed(2)}</p>
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
                  <CandlestickChart
                    data={selectedStock.historicalData}
                    analysis={analysis}
                    ticker={selectedStock.ticker}
                  />
                </div>
              )}

              {activeTab === 'analysis' && (
                <AnalysisPanel analysis={analysis} ticker={selectedStock.ticker} />
              )}

              {activeTab === 'forecast' && (
                <FinancialForecaster
                  cagr={cagr}
                  ticker={selectedStock.ticker}
                  isLiveData={selectedStock.isLiveData}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              StockSight — Real-time stock data from multiple sources. For educational purposes only. Not financial advice.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                Live prices refresh every 60s
              </span>
            </div>
          </div>
          {!hasLiveData && stocksData && (
            <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-300">
                <strong>Note:</strong> Live data APIs are currently unavailable. Showing simulated data for demonstration.
              </p>
            </div>
          )}
        </div>
      </footer>

      <AddStockModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addStock}
        existingTickers={tickers}
      />
    </div>
  );
}
