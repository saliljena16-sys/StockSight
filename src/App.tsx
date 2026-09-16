import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { 
  BarChart3, Plus, RefreshCw, Activity, 
  TrendingUp, Clock, Zap, Eye, EyeOff
} from 'lucide-react';
import { getStockInfo, simulatePriceUpdate, STARTER_STOCKS, StockInfo } from './utils/mockData';
import { analyzeStock, calculateCAGR } from './utils/technicalAnalysis';
import StockCard from './components/StockCard';
import CandlestickChart from './components/CandlestickChart';
import AnalysisPanel from './components/AnalysisPanel';
import FinancialForecaster from './components/FinancialForecaster';
import AddStockModal from './components/AddStockModal';

// SWR fetcher for mock data (simulates API call with slight delay)
const fetcher = (ticker: string): Promise<StockInfo> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getStockInfo(ticker));
    }, 100);
  });
};

export default function App() {
  const [tickers, setTickers] = useState<string[]>(STARTER_STOCKS);
  const [selectedTicker, setSelectedTicker] = useState<string>(STARTER_STOCKS[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'chart' | 'analysis' | 'forecast'>('chart');

  // Fetch data for all tracked stocks using SWR with 60-second refresh
  const { data: stocksData, mutate } = useSWR(
    tickers.length > 0 ? tickers : null,
    async (keys: string[]) => {
      const results = await Promise.all(keys.map(k => fetcher(k)));
      return results;
    },
    {
      refreshInterval: 60000, // Refresh every 60 seconds
      revalidateOnFocus: false,
    }
  );

  // Simulate live price updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (stocksData) {
        mutate(
          stocksData.map(stock => simulatePriceUpdate(stock)),
          { revalidate: false }
        );
        setLastUpdate(new Date());
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [stocksData, mutate]);

  const addStock = useCallback((ticker: string) => {
    if (!tickers.includes(ticker.toUpperCase())) {
      setTickers(prev => [...prev, ticker.toUpperCase()]);
      setSelectedTicker(ticker.toUpperCase());
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
                <p className="text-xs text-slate-500">Algorithmic Stock Analysis</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Live indicator */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span>Live</span>
                <span className="text-slate-600">•</span>
                <Clock className="w-3 h-3" />
                <span>{lastUpdate.toLocaleTimeString()}</span>
              </div>
              
              {/* Refresh button */}
              <button
                onClick={() => mutate()}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-4 h-4 text-slate-400" />
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
        {/* Stock Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {stocksData?.map((stock) => {
            const stockAnalysis = analyzeStock(stock.data);
            return (
              <div key={stock.ticker} className="relative group">
                <StockCard
                  stock={stock}
                  analysis={stockAnalysis}
                  isSelected={stock.ticker === selectedTicker}
                  onClick={() => setSelectedTicker(stock.ticker)}
                />
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
                      <h2 className="text-lg font-bold text-white">{selectedStock.ticker} — {selectedStock.name}</h2>
                      <p className="text-xs text-slate-400">{selectedStock.sector} • 1 Year Price Action</p>
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
                <FinancialForecaster cagr={cagr} ticker={selectedStock.ticker} />
              )}
            </div>
          </>
        )}

        {/* Empty State */}
        {!selectedStock && (
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
              StockSight — Algorithmic analysis for educational purposes only. Not financial advice.
            </p>
            <p className="text-xs text-slate-600">
              Data refreshes every 60s • Prices simulated for demo
            </p>
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
