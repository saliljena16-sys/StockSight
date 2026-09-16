import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { 
  BarChart3, Plus, RefreshCw, Activity, 
  TrendingUp, Clock, Zap, EyeOff, Wifi, WifiOff, Loader2
} from 'lucide-react';
import { getStockInfo, simulatePriceUpdate, STARTER_STOCKS, StockInfo } from './utils/mockData';
import { analyzeStock, calculateCAGR } from './utils/technicalAnalysis';
import StockCard from './components/StockCard';
import CandlestickChart from './components/CandlestickChart';
import AnalysisPanel from './components/AnalysisPanel';
import FinancialForecaster from './components/FinancialForecaster';
import AddStockModal from './components/AddStockModal';

// SWR fetcher - fetches real stock data from Yahoo Finance API
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

  // Fetch data for all tracked stocks using SWR with 60-second refresh
  const { data: stocksData, isLoading, mutate } = useSWR(
    tickers.length > 0 ? tickers : null,
    async (keys: string[]) => {
      const results = await Promise.all(keys.map(k => fetcher(k)));
      setLastUpdate(new Date());
      return results;
    },
    {
      refreshInterval: 60000, // Refresh every 60 seconds for live data
      revalidateOnFocus: true,
      revalidateIfStale: true,
    }
  );

  // Check if we have live data
  const hasLiveData = stocksData?.some(s => s.isLiveData) ?? false;
  const allLiveData = stocksData?.every(s => s.isLiveData) ?? false;

  // Simulate live price updates every 5 seconds (small movements between API refreshes)
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

  const addStock = useCallback((ticker: string) => {
    const upper = ticker.toUpperCase();
    if (!tickers.includes(upper)) {
      setTickers(prev => [...prev, upper]);
      setSelectedTicker(upper);
    }
  }, [tickers]);

  const removeStock = useCallback((ticker: string) => {
    setTickers(prev => {
      const next = prev.filter(t => t !== ticker);
      if (selectedTicker === ticker && next.length > 0) {
        setSelectedTicker(next[0]);
      }
      return next;
    });
  }, [selectedTicker]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
  };

  // Get selected stock data and analysis
  const selectedStock = stocksData?.find(s => s.ticker === selectedTicker);
  const analysis = selectedStock ? analyzeStock(selectedStock.data) : null;
  const cagr = selectedStock ? calculateCAGR(selectedStock.data) : 0.10;

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
              {/* Data source indicator */}
              <div className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border bg-slate-800/50">
                {hasLiveData ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span className={allLiveData ? 'text-emerald-400' : 'text-amber-400'}>
                      {allLiveData ? 'Live Market Data' : 'Partial Live Data'}
                    </span>
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                    <span className="text-blue-400">Fetching...</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-slate-500" />
                    <span className="text-slate-500">Demo Mode</span>
                  </>
                )}
              </div>
              
              {/* Live indicator */}
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <Clock className="w-3 h-3" />
                <span>{lastUpdate.toLocaleTimeString()}</span>
              </div>
              
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors disabled:opacity-50"
                title="Refresh data from Yahoo Finance"
              >
                <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              {/* Add stock button */}
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
        {/* Loading State */}
        {isLoading && !stocksData && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">Fetching Live Market Data</h2>
            <p className="text-slate-400 text-sm">Connecting to Yahoo Finance API...</p>
            <p className="text-slate-500 text-xs mt-2">Loading {STARTER_STOCKS.join(', ')} and more</p>
          </div>
        )}

        {/* Stock Cards Row */}
        {stocksData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {stocksData.map((stock) => {
              const stockAnalysis = analyzeStock(stock.data);
              return (
                <div key={stock.ticker} className="relative group">
                  <StockCard
                    stock={stock}
                    analysis={stockAnalysis}
                    isSelected={stock.ticker === selectedTicker}
                    onClick={() => setSelectedTicker(stock.ticker)}
                  />
                  {/* Live badge */}
                  {stock.isLiveData && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-[10px] text-emerald-400 font-medium">LIVE</span>
                    </div>
                  )}
                  {/* Remove button */}
                  {tickers.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeStock(stock.ticker); }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-slate-700/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                      title="Remove stock"
                    >
                      <EyeOff className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
            
            {/* Add stock card */}
            <button
              onClick={() => setShowAddModal(true)}
              className="p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/30 transition-all flex flex-col items-center justify-center gap-2 min-h-[120px]"
            >
              <Plus className="w-6 h-6 text-slate-500" />
              <span className="text-sm text-slate-500">Add Stock</span>
            </button>
          </div>
        )}

        {/* Tab Navigation */}
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

            {/* Tab Content */}
            <div className="space-y-6">
              {activeTab === 'chart' && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">{selectedStock.ticker} — {selectedStock.name}</h2>
                        {selectedStock.isLiveData && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                            LIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {selectedStock.sector} • 1 Year Price Action 
                        {selectedStock.isLiveData && ` • Last updated: ${new Date(selectedStock.lastUpdated).toLocaleTimeString()}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">${selectedStock.currentPrice.toFixed(2)}</p>
                      <p className={`text-sm font-medium ${
                        selectedStock.currentPrice >= selectedStock.previousClose ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {selectedStock.currentPrice >= selectedStock.previousClose ? '+' : ''}
                        {(selectedStock.currentPrice - selectedStock.previousClose).toFixed(2)} 
                        ({((selectedStock.currentPrice - selectedStock.previousClose) / selectedStock.previousClose * 100).toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                  <CandlestickChart data={selectedStock.data} analysis={analysis} ticker={selectedStock.ticker} />
                </div>
              )}

              {activeTab === 'analysis' && (
                <AnalysisPanel analysis={analysis} ticker={selectedStock.ticker} />
              )}

              {activeTab === 'forecast' && (
                <FinancialForecaster cagr={cagr} ticker={selectedStock.ticker} isLiveData={selectedStock.isLiveData} />
              )}
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && !selectedStock && stocksData && stocksData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <BarChart3 className="w-16 h-16 text-slate-700 mb-4" />
            <h2 className="text-xl font-bold text-slate-400 mb-2">No stocks selected</h2>
            <p className="text-slate-500 mb-4">Add a stock to get started with analysis</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Your First Stock
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              StockSight — Real-time data from Yahoo Finance. For educational purposes only. Not financial advice.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                Live prices refresh every 60s
              </span>
              <span>•</span>
              <span>Source: Yahoo Finance API</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Add Stock Modal */}
      <AddStockModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addStock}
        existingTickers={tickers}
      />
    </div>
  );
}
