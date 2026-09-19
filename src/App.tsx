import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { getStockInfo, STARTER_STOCKS, StockInfo } from './utils/mockData';
import { analyzeStock, calculateCAGR } from './utils/technicalAnalysis';
import StockCard from './components/StockCard';
import AnalysisPanel from './components/AnalysisPanel';
import AddStockModal from './components/AddStockModal';
import { createGuestPortfolioState, DEFAULT_PORTFOLIOS, loadPortfolioState, PortfolioState, savePortfolioState } from './utils/portfolioDb';
import { supabase } from './utils/supabase';
import { BarChart3, Plus, RefreshCw, Activity, TrendingUp, TrendingDown, EyeOff, Wifi, WifiOff, Loader2, Search, UserRound, MoreHorizontal, Pencil, Trash2, WalletCards, Layers3, ArrowUpRight, ArrowDownRight, LineChart } from 'lucide-react';
import LatestNewsPanel from './components/LatestNewsPanel';
import CompanyMark from './components/CompanyMark';
import { getCompanyMetadata } from './utils/companyMetadata';
import AuthModal, { AuthResult } from './components/AuthModal';
import HoldingModal from './components/HoldingModal';
import PrimaryWorkspace, { PrimaryView } from './components/PrimaryWorkspace';

const CandlestickChart = lazy(() => import('./components/CandlestickChart'));
const FinancialForecaster = lazy(() => import('./components/FinancialForecaster'));
const ComparisonPanel = lazy(() => import('./components/ComparisonPanel'));

const PanelFallback = () => <div className="flex min-h-[420px] items-center justify-center text-sm text-[var(--text-secondary)]"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading workspace…</div>;

const fetcher = async (ticker: string): Promise<StockInfo> => {
  return getStockInfo(ticker);
};

export default function App() {
  const [selectedTicker, setSelectedTicker] = useState<string>(STARTER_STOCKS[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'chart' | 'analysis' | 'forecast' | 'compare'>('chart');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [portfolios, setPortfolios] = useState<Record<string, string[]>>(DEFAULT_PORTFOLIOS);
  const [activePortfolio, setActivePortfolio] = useState<string>('My Watchlist');
  const [stockNews, setStockNews] = useState<Array<{ headline: string; summary: string; url: string; source: string; datetime: number; image?: string }>>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [tableTab, setTableTab] = useState<'summary' | 'holdings' | 'fundamentals' | 'performance'>('holdings');
  const [sectorFilter, setSectorFilter] = useState<string>('All');
  const [portfolioQuantities, setPortfolioQuantities] = useState<Record<string, Record<string, number>>>({});
  const [portfolioAverageCosts, setPortfolioAverageCosts] = useState<Record<string, Record<string, number>>>({});
  const [portfolioCash, setPortfolioCash] = useState<Record<string, number>>({});
  const [portfolioTransactions, setPortfolioTransactions] = useState<Record<string, Array<{ id: string; ticker: string; type: 'buy' | 'sell'; quantity: number; price: number; date: string }>>>({});
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [primaryView, setPrimaryView] = useState<PrimaryView>('watchlist');
  const globalSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const persistenceOwnerRef = useRef<string | null | undefined>(undefined);

  const applyPortfolioState = (saved: PortfolioState) => {
    setPortfolios(saved.portfolios);
    setPortfolioQuantities(Object.fromEntries(Object.entries(saved.holdings).map(([name, holdings]) => [name, Object.fromEntries(Object.entries(holdings).map(([ticker, holding]) => [ticker, holding.quantity]))])));
    setPortfolioAverageCosts(Object.fromEntries(Object.entries(saved.holdings).map(([name, holdings]) => [name, Object.fromEntries(Object.entries(holdings).map(([ticker, holding]) => [ticker, holding.averageCost]))])));
    setPortfolioCash(saved.cash);
    setPortfolioTransactions(saved.transactions);
    const firstPortfolio = Object.keys(saved.portfolios)[0];
    setActivePortfolio(firstPortfolio);
    setSelectedTicker(saved.portfolios[firstPortfolio]?.[0] ?? STARTER_STOCKS[0]);
  };

  const activeTickers = portfolios[activePortfolio] ?? [];

  const { data: stocksData, isLoading, mutate } = useSWR(
    activeTickers.length > 0 ? activeTickers : null,
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

  const addStock = (ticker: string) => {
    const upper = ticker.toUpperCase();
    setPortfolios(prev => {
      const current = prev[activePortfolio] ?? [];
      if (current.includes(upper)) {
        return prev;
      }

      return {
        ...prev,
        [activePortfolio]: [...current, upper]
      };
    });

    setPortfolioQuantities(prev => ({
      ...prev,
      [activePortfolio]: {
        ...(prev[activePortfolio] ?? {}),
        [upper]: (prev[activePortfolio]?.[upper] ?? 0) + 1,
      },
    }));

    setSelectedTicker(upper);
  };

  const handleQuickAdd = (ticker: string) => {
    const upper = ticker.toUpperCase();
    setPortfolioQuantities(prev => ({
      ...prev,
      [activePortfolio]: {
        ...(prev[activePortfolio] ?? {}),
        [upper]: (prev[activePortfolio]?.[upper] ?? 0) + 1,
      },
    }));

    if (!activeTickers.includes(upper)) {
      setPortfolios(prev => ({
        ...prev,
        [activePortfolio]: [...(prev[activePortfolio] ?? []), upper],
      }));
    }

    setSelectedTicker(upper);
  };

  const updateStockQuantity = (ticker: string, nextQuantity: number) => {
    const upper = ticker.toUpperCase();
    const safeQuantity = Math.max(0, Number(nextQuantity) || 0);

    setPortfolios(prev => {
      const current = prev[activePortfolio] ?? [];
      const exists = current.includes(upper);

      if (safeQuantity > 0 && !exists) {
        return {
          ...prev,
          [activePortfolio]: [...current, upper],
        };
      }

      if (safeQuantity === 0 && exists) {
        return {
          ...prev,
          [activePortfolio]: current.filter(item => item !== upper),
        };
      }

      return prev;
    });

    setPortfolioQuantities(prev => {
      const current = prev[activePortfolio] ?? {};
      const next = { ...current };

      if (safeQuantity <= 0) {
        delete next[upper];
        return {
          ...prev,
          [activePortfolio]: next,
        };
      }

      return {
        ...prev,
        [activePortfolio]: {
          ...next,
          [upper]: safeQuantity,
        },
      };
    });

    setSelectedTicker(upper);
  };

  const handleShareEdit = (ticker: string) => {
    setEditingTicker(ticker);
  };

  const removeStock = (ticker: string) => {
    setPortfolios(prev => {
      const current = prev[activePortfolio] ?? [];
      const next = current.filter(t => t !== ticker);

      if (selectedTicker === ticker && next.length > 0) {
        setSelectedTicker(next[0]);
      }

      return {
        ...prev,
        [activePortfolio]: next
      };
    });

    setPortfolioQuantities(prev => {
      const current = prev[activePortfolio] ?? {};
      const { [ticker]: _removed, ...rest } = current;
      return {
        ...prev,
        [activePortfolio]: rest,
      };
    });
    setPortfolioAverageCosts(prev => {
      const current = prev[activePortfolio] ?? {};
      const { [ticker]: _removed, ...rest } = current;
      return { ...prev, [activePortfolio]: rest };
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
  };

  const selectedStock = stocksData?.find(s => s.ticker === selectedTicker);
  const analysis = selectedStock ? analyzeStock(selectedStock.historicalData, selectedStock.hasRealHistory) : null;
  const cagr = selectedStock ? calculateCAGR(selectedStock.historicalData) : 0.10;

  const formatCompactNumber = (value: number) => {
    if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}T`;
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return value.toFixed(0);
  };

  const getApproxSharesOutstanding = (ticker: string): number => {
    const sharesByTicker: Record<string, number> = {
      AAPL: 15.8e9,
      MSFT: 7.4e9,
      NVDA: 24.6e9,
      GOOGL: 12.2e9,
      AMZN: 10.3e9,
      META: 3.6e9,
      TSLA: 3.1e9,
      JPM: 2.8e9,
    };

    return sharesByTicker[ticker.toUpperCase()] ?? 5e9;
  };

  const getSectorForTicker = (ticker: string): string => {
    const sectorMap: Record<string, string> = {
      AAPL: 'Technology',
      MSFT: 'Technology',
      NVDA: 'Technology',
      GOOGL: 'Communication Services',
      AMZN: 'Consumer Discretionary',
      META: 'Communication Services',
      TSLA: 'Automotive',
      JPM: 'Financial Services',
      XOM: 'Energy',
      CVX: 'Energy',
      SHEL: 'Energy',
      SLB: 'Energy',
      KO: 'Consumer Staples',
      PEP: 'Consumer Staples',
      WMT: 'Consumer Staples',
      JNJ: 'Healthcare',
      UNH: 'Healthcare',
      PG: 'Consumer Staples',
      DIS: 'Communication Services',
      NFLX: 'Communication Services',
      IBM: 'Technology',
      AMD: 'Technology',
    };

    return sectorMap[ticker.toUpperCase()] ?? 'Unknown';
  };

  const filteredStocks = (stocksData ?? []).filter(stock => sectorFilter === 'All' || stock.sector === sectorFilter);
  const availableSectors = Array.from(new Set((stocksData ?? []).map(stock => stock.sector).filter(Boolean)));

  const getTableMetrics = (stock: StockInfo) => {
    const recentWindow = stock.historicalData.slice(-7);
    const quarterWindow = stock.historicalData.slice(-90);
    const dayLow = Math.min(...recentWindow.map((point) => point.low));
    const dayHigh = Math.max(...recentWindow.map((point) => point.high));
    const yearLow = Math.min(...stock.historicalData.map((point) => point.low));
    const yearHigh = Math.max(...stock.historicalData.map((point) => point.high));
    const volume = stock.volume || recentWindow[recentWindow.length - 1]?.volume || 0;
    const avgVolume = quarterWindow.length > 0
      ? quarterWindow.reduce((sum, point) => sum + point.volume, 0) / quarterWindow.length
      : 0;
    const marketCap = stock.currentPrice * getApproxSharesOutstanding(stock.ticker);
    const sparklinePoints = recentWindow
      .map((point, index) => `${index * 12},${Math.max(26 - ((point.close - yearLow) / Math.max(yearHigh - yearLow, 1)) * 26, 2)}`)
      .join(' ');

    return {
      dayLow,
      dayHigh,
      yearLow,
      yearHigh,
      volume,
      avgVolume,
      marketCap,
      sparklinePoints,
    };
  };

  const getFundamentalMetrics = (stock: StockInfo) => {
    const metrics = getTableMetrics(stock);
    const ticker = stock.ticker.toUpperCase();
    const defaultProfile = {
      epsEstimate: 9.5,
      forwardPe: 35,
      divPerShare: 1.05,
      fwdAnnDivRate: 1.08,
      ttlAnnDivRate: 1.05,
      priceToBook: 45,
      divPaymentDate: '2026-08-12',
      exDivDate: '2026-08-10',
      marketCapOffset: 1,
    };

    const profileMap: Record<string, typeof defaultProfile> = {
      AAPL: {
        epsEstimate: 9.58,
        forwardPe: 34.69,
        divPerShare: 1.05,
        fwdAnnDivRate: 1.08,
        ttlAnnDivRate: 1.05,
        priceToBook: 45.16,
        divPaymentDate: '2026-08-12',
        exDivDate: '2026-08-10',
        marketCapOffset: 1,
      },
      MSFT: {
        epsEstimate: 11.48,
        forwardPe: 32.13,
        divPerShare: 3.40,
        fwdAnnDivRate: 3.64,
        ttlAnnDivRate: 3.64,
        priceToBook: 15.90,
        divPaymentDate: '2026-09-09',
        exDivDate: '2026-09-11',
        marketCapOffset: 1,
      },
      NVDA: {
        epsEstimate: 4.41,
        forwardPe: 52.50,
        divPerShare: 0.28,
        fwdAnnDivRate: 1.00,
        ttlAnnDivRate: 0.28,
        priceToBook: 22.56,
        divPaymentDate: '2026-09-30',
        exDivDate: '2026-09-10',
        marketCapOffset: 1,
      },
    };

    const profile = profileMap[ticker] ?? defaultProfile;
    const priceFactor = stock.currentPrice / (ticker === 'AAPL' ? 332.41 : ticker === 'MSFT' ? 490.30 : ticker === 'NVDA' ? 213.90 : stock.currentPrice || 1);
    const epsEstimate = Number((profile.epsEstimate * priceFactor).toFixed(2));
    const forwardPe = Number((profile.forwardPe * (stock.currentPrice / (ticker === 'AAPL' ? 332.41 : ticker === 'MSFT' ? 490.3 : ticker === 'NVDA' ? 213.9 : stock.currentPrice))).toFixed(2));
    const marketCap = metrics.marketCap;
    const avgVolume = metrics.avgVolume;
    const divPerShare = Number((profile.divPerShare * (stock.currentPrice / (ticker === 'AAPL' ? 332.41 : ticker === 'MSFT' ? 490.3 : ticker === 'NVDA' ? 213.9 : stock.currentPrice))).toFixed(2));
    const fwdAnnDivRate = Number((profile.fwdAnnDivRate * (stock.currentPrice / (ticker === 'AAPL' ? 332.41 : ticker === 'MSFT' ? 490.3 : ticker === 'NVDA' ? 213.9 : stock.currentPrice))).toFixed(2));
    const ttlAnnDivRate = Number((profile.ttlAnnDivRate * (stock.currentPrice / (ticker === 'AAPL' ? 332.41 : ticker === 'MSFT' ? 490.3 : ticker === 'NVDA' ? 213.9 : stock.currentPrice))).toFixed(2));
    const priceToBook = Number((profile.priceToBook * (stock.currentPrice / (ticker === 'AAPL' ? 332.41 : ticker === 'MSFT' ? 490.3 : ticker === 'NVDA' ? 213.9 : stock.currentPrice))).toFixed(2));

    return {
      symbol: stock.ticker,
      lastPrice: stock.currentPrice,
      marketCap,
      avgVolume,
      epsEstimate,
      forwardPe: Number.isFinite(forwardPe) && forwardPe > 0 ? forwardPe : profile.forwardPe,
      divPaymentDate: profile.divPaymentDate,
      exDivDate: profile.exDivDate,
      divPerShare: Number.isFinite(divPerShare) && divPerShare > 0 ? divPerShare : profile.divPerShare,
      fwdAnnDivRate: Number.isFinite(fwdAnnDivRate) && fwdAnnDivRate > 0 ? fwdAnnDivRate : profile.fwdAnnDivRate,
      fwdAnnDivYield: stock.currentPrice > 0 ? (profile.fwdAnnDivRate / stock.currentPrice) * 100 : 0,
      ttlAnnDivRate: Number.isFinite(ttlAnnDivRate) && ttlAnnDivRate > 0 ? ttlAnnDivRate : profile.ttlAnnDivRate,
      ttlAnnDivYield: stock.currentPrice > 0 ? (profile.ttlAnnDivRate / stock.currentPrice) * 100 : 0,
      priceToBook: Number.isFinite(priceToBook) && priceToBook > 0 ? priceToBook : profile.priceToBook,
    };
  };

  const getPeriodReturn = (stock: StockInfo, sessions: number) => {
    const points = stock.historicalData;
    if (points.length < 2) return 0;
    const end = points[points.length - 1].close;
    const start = points[Math.max(0, points.length - 1 - sessions)].close;
    return start > 0 ? ((end - start) / start) * 100 : 0;
  };

  const portfolioValue = (stocksData ?? []).reduce((total, stock) => {
    const quantity = portfolioQuantities[activePortfolio]?.[stock.ticker] ?? 0;
    return total + (quantity > 0 ? stock.currentPrice * quantity : 0);
  }, 0);
  const cashBalance = portfolioCash[activePortfolio] ?? 0;
  const totalPortfolioValue = portfolioValue + cashBalance;
  const portfolioCostBasis = (stocksData ?? []).reduce((total, stock) => {
    const quantity = portfolioQuantities[activePortfolio]?.[stock.ticker] ?? 0;
    const averageCost = portfolioAverageCosts[activePortfolio]?.[stock.ticker] ?? stock.currentPrice;
    return total + quantity * averageCost;
  }, 0);
  const portfolioTotalGain = portfolioValue - portfolioCostBasis;
  const portfolioTotalGainPercent = portfolioCostBasis > 0 ? (portfolioTotalGain / portfolioCostBasis) * 100 : 0;

  const holdingStocks = (stocksData ?? []).filter(stock => (portfolioQuantities[activePortfolio]?.[stock.ticker] ?? 0) > 0);
  const portfolioDayChange = holdingStocks.reduce((total, stock) => {
    const quantity = portfolioQuantities[activePortfolio]?.[stock.ticker] ?? 0;
    return total + (stock.currentPrice - stock.previousClose) * quantity;
  }, 0);
  const portfolioPreviousValue = holdingStocks.reduce((total, stock) => {
    const quantity = portfolioQuantities[activePortfolio]?.[stock.ticker] ?? 0;
    return total + stock.previousClose * quantity;
  }, 0);
  const portfolioDayChangePercent = portfolioPreviousValue > 0 ? (portfolioDayChange / portfolioPreviousValue) * 100 : 0;
  const performers = holdingStocks.map(stock => {
    const change = stock.currentPrice - stock.previousClose;
    const percent = stock.previousClose > 0 ? (change / stock.previousClose) * 100 : 0;
    return { stock, change, percent };
  });
  const bestPerformer = performers.length > 0
    ? performers.reduce((best, item) => item.percent > best.percent ? item : best)
    : null;
  const worstPerformer = performers.length > 0
    ? performers.reduce((worst, item) => item.percent < worst.percent ? item : worst)
    : null;
  const sectorCounts = holdingStocks.reduce<Record<string, number>>((counts, stock) => {
    const sector = stock.sector || 'Unknown';
    counts[sector] = (counts[sector] ?? 0) + 1;
    return counts;
  }, {});
  const dominantSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0];
  const sectorSummary = dominantSector && holdingStocks.length > 0
    ? `${Math.round((dominantSector[1] / holdingStocks.length) * 100)}% ${dominantSector[0]}`
    : 'No holdings';

  useEffect(() => {
    if (stocksData && stocksData.length > 0 && sectorFilter !== 'All' && !stocksData.some(stock => stock.sector === sectorFilter)) {
      setSectorFilter('All');
    }
  }, [stocksData, sectorFilter]);

  const getHoldingMetrics = (stock: StockInfo, quantity: number) => {
    const hasHolding = quantity > 0;
    const previousClose = stock.previousClose || stock.currentPrice;
    const dayChange = stock.currentPrice - previousClose;
    const dayChangePct = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;
    const avgCostPerShare = hasHolding ? (portfolioAverageCosts[activePortfolio]?.[stock.ticker] ?? stock.currentPrice) : 0;
    const totalCost = hasHolding ? avgCostPerShare * quantity : 0;
    const marketValue = stock.currentPrice * quantity;
    const totalDivIncome = 0;
    const dayGainDollar = dayChange * quantity;
    const dayGainPct = previousClose > 0 ? dayChangePct : 0;
    const totalGainDollar = marketValue - totalCost;
    const totalGainPct = totalCost > 0 ? (totalGainDollar / totalCost) * 100 : 0;
    const realizedGainDollar = 0;
    const realizedGainPct = 0;

    return {
      hasHolding,
      status: hasHolding ? 'Open' : '-',
      shares: quantity,
      avgCostPerShare,
      totalCost,
      marketValue,
      totalDivIncome,
      dayGainPct,
      dayGainDollar,
      totalGainPct,
      totalGainDollar,
      realizedGainPct,
      realizedGainDollar,
    };
  };

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      const currentUser = supabase ? (await supabase.auth.getSession()).data.session?.user ?? null : null;
      const nextUserId = currentUser?.id ?? null;
      const saved = await loadPortfolioState(nextUserId);
      if (!isMounted) return;

      persistenceOwnerRef.current = nextUserId;
      setUserId(nextUserId);
      setUserEmail(currentUser?.email ?? null);
      if (saved && Object.keys(saved.portfolios).length > 0) {
        applyPortfolioState(saved);
      }

      setIsHydrated(true);
    };

    hydrateSession();

    const { data: authListener } = supabase
      ? supabase.auth.onAuthStateChange((_event, session) => {
          const currentUser = session?.user ?? null;
          setUserId(currentUser?.id ?? null);
          setUserEmail(currentUser?.email ?? null);
          void hydrateSession();
        })
      : { data: { subscription: { unsubscribe: () => undefined } } };

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || persistenceOwnerRef.current !== userId) return;
    const holdings = Object.fromEntries(Object.keys(portfolios).map(name => [name, Object.fromEntries(Object.entries(portfolioQuantities[name] ?? {}).map(([ticker, quantity]) => [ticker, { quantity, averageCost: portfolioAverageCosts[name]?.[ticker] ?? 0 }]))]));
    void savePortfolioState({ portfolios, holdings, cash: portfolioCash, transactions: portfolioTransactions }, userId);
  }, [portfolios, portfolioQuantities, portfolioAverageCosts, portfolioCash, portfolioTransactions, isHydrated, userId]);

  const handleAuth = async (mode: 'signin' | 'signup', email: string, password: string): Promise<AuthResult> => {
    if (!supabase) {
      return { error: 'Cloud sync is not configured for this deployment.' };
    }
    const { data, error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/` } });
    if (error) {
      return { error: error.message.toLowerCase().includes('email not confirmed') ? 'Verify your email using the confirmation link before signing in.' : error.message };
    }
    if (mode === 'signup' && !data.session) {
      return { confirmationRequired: true };
    }
    setUserId(data.user?.id ?? null);
    setUserEmail(data.user?.email ?? null);
    setNotice('Portfolio sync is active.');
    return {};
  };

  const handleResendConfirmation = async (email: string): Promise<string | null> => {
    if (!supabase) return 'Cloud sync is not configured.';
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/` } });
    return error?.message ?? null;
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    const guestState = createGuestPortfolioState();
    persistenceOwnerRef.current = null;
    setUserId(null);
    setUserEmail(null);
    applyPortfolioState(guestState);
    await savePortfolioState(guestState, null);
    setNotice('Signed out. Showing a fresh selection of popular stocks.');
  };

  const handleCreatePortfolio = () => {
    const nextName = window.prompt('Create a portfolio name', `Portfolio ${Object.keys(portfolios).length + 1}`);
    if (!nextName || !nextName.trim()) return;

    const cleaned = nextName.trim();
    setPortfolios(prev => {
      if (prev[cleaned]) {
        return prev;
      }

      return {
        ...prev,
        [cleaned]: []
      };
    });
    setPortfolioQuantities(prev => ({ ...prev, [cleaned]: {} }));
    setPortfolioAverageCosts(prev => ({ ...prev, [cleaned]: {} }));
    setPortfolioCash(prev => ({ ...prev, [cleaned]: 0 }));
    setPortfolioTransactions(prev => ({ ...prev, [cleaned]: [] }));
    setActivePortfolio(cleaned);
  };

  const handleRenamePortfolio = () => {
    const currentName = activePortfolio;
    const nextName = window.prompt('Rename portfolio', currentName);
    if (!nextName || !nextName.trim()) return;

    const cleaned = nextName.trim();
    if (cleaned === currentName) return;

    setPortfolios(prev => {
      if (prev[cleaned]) {
        return prev;
      }

      const next = { ...prev };
      const currentTickers = next[currentName] ?? [];
      delete next[currentName];
      next[cleaned] = currentTickers;
      return next;
    });
    setPortfolioQuantities(prev => { const next = { ...prev }; next[cleaned] = next[currentName] ?? {}; delete next[currentName]; return next; });
    setPortfolioAverageCosts(prev => { const next = { ...prev }; next[cleaned] = next[currentName] ?? {}; delete next[currentName]; return next; });
    setPortfolioCash(prev => { const next = { ...prev, [cleaned]: prev[currentName] ?? 0 }; delete next[currentName]; return next; });
    setPortfolioTransactions(prev => { const next = { ...prev, [cleaned]: prev[currentName] ?? [] }; delete next[currentName]; return next; });

    setActivePortfolio(cleaned);
  };

  const handleDeletePortfolio = () => {
    if (Object.keys(portfolios).length <= 1) {
      window.alert('You must keep at least one portfolio.');
      return;
    }

    const confirmed = window.confirm(`Delete the portfolio "${activePortfolio}"?`);
    if (!confirmed) return;

    const nextPortfolios = { ...portfolios };
    delete nextPortfolios[activePortfolio];
    const remaining = Object.keys(nextPortfolios);
    setPortfolios(nextPortfolios);
    setPortfolioQuantities(prev => { const next = { ...prev }; delete next[activePortfolio]; return next; });
    setPortfolioAverageCosts(prev => { const next = { ...prev }; delete next[activePortfolio]; return next; });
    setPortfolioCash(prev => { const next = { ...prev }; delete next[activePortfolio]; return next; });
    setPortfolioTransactions(prev => { const next = { ...prev }; delete next[activePortfolio]; return next; });
    setActivePortfolio(remaining[0] ?? 'My Watchlist');
  };

  useEffect(() => {
    const currentPortfolioTickers = portfolios[activePortfolio] ?? [];
    if (currentPortfolioTickers.length > 0 && !currentPortfolioTickers.includes(selectedTicker)) {
      setSelectedTicker(currentPortfolioTickers[0]);
    }
  }, [activePortfolio, portfolios, selectedTicker]);

  useEffect(() => {
    setPortfolioQuantities(prev => {
      const next = { ...prev };
      Object.keys(portfolios).forEach((portfolioName) => {
        const current = portfolios[portfolioName] ?? [];
        next[portfolioName] = { ...(next[portfolioName] ?? {}) };

        current.forEach((ticker) => {
          if (!next[portfolioName][ticker]) {
            next[portfolioName][ticker] = 1;
          }
        });

        Object.keys(next[portfolioName]).forEach((ticker) => {
          if (!current.includes(ticker)) {
            delete next[portfolioName][ticker];
          }
        });
      });

      Object.keys(next).forEach((portfolioName) => {
        if (!portfolios[portfolioName]) {
          delete next[portfolioName];
        }
      });

      return next;
    });
  }, [portfolios]);

  useEffect(() => {
    if (!selectedStock) {
      setStockNews([]);
      return;
    }

    const fetchNews = async () => {
      const token = import.meta.env.VITE_FINNHUB_API_KEY;
      if (!token) {
        setStockNews([]);
        return;
      }

      setNewsLoading(true);

      try {
        const now = new Date();
        const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fromDate = from.toISOString().slice(0, 10);
        const toDate = now.toISOString().slice(0, 10);
        const response = await fetch(
          `https://finnhub.io/api/v1/company-news?symbol=${selectedStock.ticker}&from=${fromDate}&to=${toDate}&token=${token}`
        );

        if (!response.ok) {
          throw new Error(`News request failed: ${response.status}`);
        }

        const items = await response.json();
        setStockNews(Array.isArray(items) ? items.slice(0, 5) : []);
      } catch (error) {
        console.warn('Unable to load stock news:', error);
        setStockNews([]);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, [selectedStock?.ticker]);

  useEffect(() => {
    const handleCommandSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        (window.innerWidth < 1024 ? mobileSearchRef.current : globalSearchRef.current)?.focus();
      }
    };

    window.addEventListener('keydown', handleCommandSearch);
    return () => window.removeEventListener('keydown', handleCommandSearch);
  }, []);

  const handleGlobalSearch = () => {
    const ticker = globalSearch.trim().toUpperCase();
    if (!ticker) return;
    if (activeTickers.includes(ticker)) {
      setSelectedTicker(ticker);
    } else {
      addStock(ticker);
    }
    setGlobalSearch('');
  };

  return (
    <div className="min-h-screen bg-transparent text-[#f3f5f2]">
      <header className="sticky top-0 z-40 border-b border-white/[.09] bg-[#090d0f]/95 backdrop-blur-xl">
        <div className="mx-auto w-[calc(100%-24px)] max-w-[1680px] sm:w-[calc(100%-32px)] xl:w-[calc(100%-48px)]">
          <div className="flex h-16 items-center gap-3 sm:h-[72px] sm:gap-6">
            <div className="flex shrink-0 items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-[8px] bg-lime-300 text-[#09100b] sm:h-10 sm:w-10">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-[17px] font-semibold leading-5 tracking-[-.03em] text-white">StockSight</h1>
                <p className="hidden text-[10px] uppercase tracking-[.18em] text-[#727b74] min-[370px]:block">Market workspace</p>
              </div>
            </div>

            <nav className="hidden h-full items-center gap-7 xl:flex" aria-label="Primary navigation">
              <button
                type="button"
                aria-current={primaryView === 'watchlist' ? 'page' : undefined}
                onClick={() => { setPrimaryView('watchlist'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`relative h-full text-sm font-medium focus-visible:rounded-sm ${primaryView === 'watchlist' ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-lime-300' : 'text-[var(--text-secondary)] hover:text-white'}`}
              >
                Watchlist
              </button>
              {([['Markets', 'markets'], ['Screeners', 'screeners'], ['News', 'news'], ['Analytics', 'analytics']] as Array<[string, PrimaryView]>).map(([item, view]) => (
                <button
                  key={item}
                  type="button"
                  aria-current={primaryView === view ? 'page' : undefined}
                  onClick={() => { setPrimaryView(view); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={`relative h-full text-sm font-medium ${primaryView === view ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-lime-300' : 'text-[var(--text-secondary)] hover:text-white'}`}
                >
                  {item}
                </button>
              ))}
            </nav>

            <div className="relative ml-auto hidden min-w-[240px] max-w-[360px] flex-1 lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                ref={globalSearchRef}
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleGlobalSearch()}
                placeholder="Search symbols, companies, or ideas…"
                aria-label="Search symbols, companies, or ideas"
                className="h-10 w-full rounded-[8px] border border-white/[.1] bg-[var(--surface-1)] pl-10 pr-16 text-sm text-white placeholder:text-[var(--text-tertiary)] focus:border-lime-300/35 focus:outline-none"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-white/[.1] bg-white/[.035] px-1.5 py-0.5 font-sans text-[10px] text-[var(--text-tertiary)]">Ctrl K</kbd>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden items-center gap-2 md:flex">
                {hasLiveData ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-[var(--positive)]" />
                    <span className="leading-tight">
                      <span className={`block text-[11px] font-semibold uppercase tracking-[.06em] ${allLiveData ? 'text-[var(--positive)]' : 'text-[var(--warning)]'}`}>{allLiveData ? 'Market open' : 'Partial data'}</span>
                      <span className="hidden text-[10px] text-[var(--text-tertiary)] 2xl:block">Finnhub + Yahoo</span>
                    </span>
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 text-[#89918b] animate-spin" />
                    <span className="text-[#89918b]">Syncing data</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-500" />
                    <span className="text-[#e4b75c]">Demo data</span>
                  </>
                )}
              </div>

              <div className="hidden xl:flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
                <span>{lastUpdate.toLocaleTimeString()}</span>
              </div>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="hidden h-10 w-10 place-items-center rounded-[8px] border border-white/[.1] bg-white/[.025] hover:bg-white/[.06] disabled:opacity-50 md:grid"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              <button onClick={userEmail ? handleSignOut : () => setShowAuthModal(true)} aria-label={userEmail ? `Account: ${userEmail}. Sign out` : 'Sign in'} title={userEmail ?? 'Sign in'} className="hidden h-10 w-10 place-items-center rounded-full border border-white/[.16] bg-white/[.035] text-[var(--text-secondary)] hover:border-white/25 hover:text-white sm:grid">
                {userEmail ? <span className="text-xs font-semibold text-white">{userEmail.charAt(0).toUpperCase()}</span> : <UserRound className="h-4 w-4" />}
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                aria-label="Add stock"
                className="flex h-10 items-center gap-2 rounded-[8px] bg-lime-300 px-3 text-sm font-semibold text-[#10140f] hover:bg-lime-200 sm:px-4"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Stock</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="mobile-scroll sticky top-16 z-30 grid grid-cols-5 overflow-x-auto border-b border-white/[.08] bg-[#090d0f]/95 px-2 backdrop-blur-xl sm:top-[72px] sm:px-4 xl:hidden" aria-label="Primary navigation">
        {([['Watchlist', 'watchlist'], ['Markets', 'markets'], ['Screeners', 'screeners'], ['News', 'news'], ['Analytics', 'analytics']] as Array<[string, PrimaryView]>).map(([label, view]) => (
          <button key={view} onClick={() => setPrimaryView(view)} aria-current={primaryView === view ? 'page' : undefined} className={`min-h-11 min-w-0 border-b-2 px-1 text-[11px] font-medium min-[380px]:text-xs sm:px-4 sm:text-sm ${primaryView === view ? 'border-lime-300 text-white' : 'border-transparent text-[var(--text-secondary)]'}`}>{label}</button>
        ))}
      </nav>

      <div className="border-b border-white/[.08] bg-[#090d0f] px-3 py-3 lg:hidden">
        <div className="relative mx-auto max-w-[1680px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            ref={mobileSearchRef}
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleGlobalSearch()}
            placeholder="Search a symbol, e.g. AAPL"
            aria-label="Search symbols or companies"
            className="h-11 w-full rounded-[9px] border border-white/[.1] bg-[var(--surface-1)] pl-10 pr-4 text-base text-white placeholder:text-sm placeholder:text-[var(--text-tertiary)] focus:border-lime-300/35 focus:outline-none"
          />
        </div>
      </div>

      {primaryView === 'watchlist' && <section className="border-b border-white/[.08] bg-[#0b1011]/75">
        <div className="mx-auto flex min-h-[92px] w-[calc(100%-24px)] max-w-[1680px] flex-col justify-center gap-3 py-4 sm:w-[calc(100%-32px)] md:min-h-[104px] md:flex-row md:items-center md:justify-between md:gap-4 md:py-5 xl:w-[calc(100%-48px)]">
          <div className="flex items-stretch gap-4">
            <span className="w-[3px] rounded-full bg-lime-300/80" />
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-.035em] text-white">{activePortfolio}</h2>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                {holdingStocks.length} holdings <span className="mx-1 text-[var(--text-tertiary)]">•</span> <span className="font-mono">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
            </div>
          </div>

          <div className="mobile-scroll flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {Object.keys(portfolios).length > 1 && Object.keys(portfolios).map((portfolio) => (
              <button
                key={portfolio}
                onClick={() => setActivePortfolio(portfolio)}
                className={`min-h-10 whitespace-nowrap rounded-[7px] px-3 text-sm ${
                  activePortfolio === portfolio
                    ? 'bg-white/[.07] text-white'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {portfolio}
              </button>
            ))}
            <button
              onClick={handleRenamePortfolio}
              aria-label="Rename portfolio"
              title="Rename portfolio"
              className="inline-flex min-h-10 items-center gap-2 rounded-[7px] border border-white/[.1] px-4 text-sm text-[var(--text-secondary)] hover:bg-white/[.04] hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Rename</span>
            </button>
            <button
              onClick={handleDeletePortfolio}
              disabled={Object.keys(portfolios).length <= 1}
              aria-label="Delete portfolio"
              title="Delete portfolio"
              className="inline-flex min-h-10 items-center gap-2 rounded-[7px] border border-red-400/20 bg-red-400/[.03] px-4 text-sm text-red-300/80 hover:bg-red-400/[.07] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Delete</span>
            </button>
            <button
              onClick={handleCreatePortfolio}
              aria-label="Create portfolio"
              title="Create portfolio"
              className="min-h-10 whitespace-nowrap rounded-[7px] border border-white/[.1] px-4 text-sm text-white hover:bg-white/[.05]"
            >
              <Plus className="inline h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">New Portfolio</span>
            </button>
          </div>
        </div>
      </section>}

      {/* Main Content */}
      <main className="mx-auto min-w-0 w-[calc(100%-24px)] max-w-[1680px] py-4 sm:w-[calc(100%-32px)] sm:py-6 xl:w-[calc(100%-48px)]">
        {notice && <div role="status" className="mb-5 flex items-center justify-between rounded-[8px] border border-lime-300/20 bg-lime-300/[.06] px-4 py-3 text-sm text-lime-100"><span>{notice}</span><button onClick={() => setNotice(null)} className="text-xs text-lime-200/70 hover:text-white">Dismiss</button></div>}
        {primaryView !== 'watchlist' && (
          <PrimaryWorkspace
            view={primaryView}
            stocks={stocksData ?? []}
            quantities={portfolioQuantities[activePortfolio] ?? {}}
            totalValue={totalPortfolioValue}
            cash={cashBalance}
            onInspect={(ticker) => {
              setSelectedTicker(ticker);
              setPrimaryView('watchlist');
              setActiveTab('chart');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
        {primaryView === 'watchlist' && isLoading && !stocksData && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">Fetching Live Market Data</h2>
            <p className="text-slate-400 text-sm">Connecting to APIs...</p>
          </div>
        )}

        {primaryView === 'watchlist' && stocksData && (
          <div className="mb-5 flex flex-col gap-3 border-b border-white/[.08] sm:flex-row sm:items-end sm:justify-between">
            <nav className="mobile-scroll flex items-center gap-5 overflow-x-auto" aria-label="Portfolio views">
              {[
                { label: 'Summary', value: 'summary' },
                { label: 'Holdings', value: 'holdings' },
                { label: 'Fundamentals', value: 'fundamentals' },
                { label: 'Performance', value: 'performance' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setTableTab(tab.value as typeof tableTab);
                    setViewMode('table');
                    setActiveTab('chart');
                  }}
                  aria-selected={viewMode === 'table' && tableTab === tab.value}
                  className={`min-h-11 whitespace-nowrap border-b-2 text-sm font-medium ${viewMode === 'table' && tableTab === tab.value ? 'border-lime-300 text-white' : 'border-transparent text-[var(--text-secondary)] hover:text-white'}`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="mb-2 flex items-center gap-1 rounded-[8px] border border-white/[.1] bg-white/[.025] p-1">
              <button onClick={() => setViewMode('cards')} className={`min-h-9 rounded-[6px] px-3 text-sm font-medium ${viewMode === 'cards' ? 'bg-white/[.1] text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}>Cards</button>
              <button onClick={() => { setViewMode('table'); setActiveTab('chart'); }} className={`min-h-9 rounded-[6px] px-3 text-sm font-medium ${viewMode === 'table' ? 'bg-white/[.1] text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}>Table</button>
            </div>
          </div>
        )}

        {primaryView === 'watchlist' && stocksData && viewMode === 'table' && (
          <div className="mb-7 overflow-hidden rounded-[10px] border border-white/[.1] bg-[var(--surface-1)]">
            {tableTab !== 'summary' && <div className="flex items-center justify-end gap-3 border-b border-white/[.07] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 rounded-[7px] border border-white/[.09] bg-white/[.03] px-3 py-2 text-xs text-[#89918b]">
                  <span>Sector</span>
                  <select
                    value={sectorFilter}
                    onChange={(event) => setSectorFilter(event.target.value)}
                    className="bg-[#101411] text-white outline-none"
                  >
                    <option value="All">All</option>
                    {availableSectors.map((sector) => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="rounded-[7px] border border-white/[.1] bg-white/[.04] px-3 py-2 text-xs font-medium text-white hover:bg-white/[.08]"
                >
                  + Add tickers
                </button>
              </div>
            </div>}

            <div className="overflow-x-auto">
              {tableTab === 'summary' && (
                <div className="p-4">
                  <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                    <div className="relative rounded-[8px] border border-white/[.1] bg-[var(--surface-2)] p-5">
                      <WalletCards className="absolute right-4 top-4 h-5 w-5 text-[#7f9186]" />
                      <div className="pr-8 text-xs uppercase tracking-[.12em] text-[var(--text-secondary)]">Portfolio value</div>
                      <div className="mt-2 font-mono text-[28px] font-medium tracking-[-.04em] text-white">${totalPortfolioValue.toFixed(2)}</div>
                      <div className={`mt-1 font-mono text-[13px] ${portfolioDayChange >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                        {portfolioDayChange >= 0 ? '+' : '-'}${Math.abs(portfolioDayChange).toFixed(2)} ({portfolioDayChangePercent >= 0 ? '+' : ''}{portfolioDayChangePercent.toFixed(2)}%)
                      </div>
                    </div>
                    <div className="relative rounded-[8px] border border-white/[.1] bg-[var(--surface-2)] p-5">
                      {portfolioDayChange >= 0 ? <TrendingUp className="absolute right-4 top-4 h-5 w-5 text-[var(--positive)]" /> : <TrendingDown className="absolute right-4 top-4 h-5 w-5 text-[var(--negative)]" />}
                      <div className="pr-8 text-xs uppercase tracking-[.12em] text-[var(--text-secondary)]">Day P/L</div>
                      <div className={`mt-2 font-mono text-[28px] font-medium tracking-[-.04em] ${portfolioDayChange >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                        {portfolioDayChange >= 0 ? '+' : '-'}${Math.abs(portfolioDayChange).toFixed(2)}
                      </div>
                      <div className={`mt-1 font-mono text-[13px] ${portfolioDayChangePercent >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>{portfolioDayChangePercent >= 0 ? '+' : ''}{portfolioDayChangePercent.toFixed(2)}%</div>
                    </div>
                    <div className="relative rounded-[8px] border border-white/[.1] bg-[var(--surface-2)] p-5">
                      <Layers3 className="absolute right-4 top-4 h-5 w-5 text-[#7f9186]" />
                      <div className="pr-8 text-xs uppercase tracking-[.12em] text-[var(--text-secondary)]">Holdings</div>
                      <div className="mt-2 font-mono text-[28px] font-medium text-white">{holdingStocks.length}</div>
                      <div className="mt-1 text-[13px] text-[var(--text-secondary)]">{sectorSummary}</div>
                    </div>
                    <div className="relative rounded-[8px] border border-white/[.1] bg-[var(--surface-2)] p-5">
                      <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 text-[var(--positive)]" />
                      <div className="pr-8 text-xs uppercase tracking-[.12em] text-[var(--text-secondary)]">Best performer</div>
                      <div className="mt-2 text-xl font-semibold text-white">{bestPerformer?.stock.ticker ?? '—'}</div>
                      <div className="mt-1 font-mono text-[13px] text-[var(--positive)]">{bestPerformer ? `${bestPerformer.change >= 0 ? '+' : '-'}$${Math.abs(bestPerformer.change).toFixed(2)} (${bestPerformer.percent >= 0 ? '+' : ''}${bestPerformer.percent.toFixed(2)}%)` : '—'}</div>
                    </div>
                    <div className="relative rounded-[8px] border border-white/[.1] bg-[var(--surface-2)] p-5">
                      <ArrowDownRight className="absolute right-4 top-4 h-5 w-5 text-[var(--negative)]" />
                      <div className="pr-8 text-xs uppercase tracking-[.12em] text-[var(--text-secondary)]">Worst performer</div>
                      <div className="mt-2 text-xl font-semibold text-white">{worstPerformer?.stock.ticker ?? '—'}</div>
                      <div className="mt-1 font-mono text-[13px] text-[var(--negative)]">{worstPerformer ? `${worstPerformer.change >= 0 ? '+' : '-'}$${Math.abs(worstPerformer.change).toFixed(2)} (${worstPerformer.percent >= 0 ? '+' : ''}${worstPerformer.percent.toFixed(2)}%)` : '—'}</div>
                    </div>
                  </div>

                  <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_1fr_2fr]">
                    <div className="rounded-[8px] border border-white/[.08] bg-black/10 p-4"><p className="text-[10px] uppercase tracking-[.12em] text-[var(--text-tertiary)]">Total return</p><p className={`mt-2 font-mono text-lg ${portfolioTotalGain >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>{portfolioTotalGain >= 0 ? '+' : '-'}${Math.abs(portfolioTotalGain).toFixed(2)} ({portfolioTotalGainPercent >= 0 ? '+' : ''}{portfolioTotalGainPercent.toFixed(2)}%)</p></div>
                    <label className="rounded-[8px] border border-white/[.08] bg-black/10 p-4"><span className="text-[10px] uppercase tracking-[.12em] text-[var(--text-tertiary)]">Cash position</span><span className="mt-2 flex items-center font-mono text-lg text-white">$<input aria-label="Cash position" type="number" min="0" step="0.01" value={cashBalance} onChange={event => setPortfolioCash(prev => ({ ...prev, [activePortfolio]: Math.max(0, Number(event.target.value) || 0) }))} className="min-w-0 flex-1 bg-transparent pl-1 text-white outline-none" /></span></label>
                    <div className="rounded-[8px] border border-white/[.08] bg-black/10 p-4"><p className="text-[10px] uppercase tracking-[.12em] text-[var(--text-tertiary)]">Sector allocation by market value</p><div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/[.05]">{Object.entries(holdingStocks.reduce<Record<string, number>>((values, stock) => ({ ...values, [stock.sector || 'Unknown']: (values[stock.sector || 'Unknown'] ?? 0) + stock.currentPrice * (portfolioQuantities[activePortfolio]?.[stock.ticker] ?? 0) }), {})).map(([sector, value], index) => <span key={sector} title={`${sector}: ${portfolioValue > 0 ? ((value / portfolioValue) * 100).toFixed(1) : 0}%`} style={{ width: `${portfolioValue > 0 ? (value / portfolioValue) * 100 : 0}%`, backgroundColor: ['#b7f34a', '#9b8ce8', '#e4b75c', '#54d99a', '#f07878'][index % 5] }} />)}</div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">{Object.entries(holdingStocks.reduce<Record<string, number>>((values, stock) => ({ ...values, [stock.sector || 'Unknown']: (values[stock.sector || 'Unknown'] ?? 0) + stock.currentPrice * (portfolioQuantities[activePortfolio]?.[stock.ticker] ?? 0) }), {})).map(([sector, value]) => <span key={sector} className="text-[11px] text-[var(--text-secondary)]">{sector} {portfolioValue > 0 ? ((value / portfolioValue) * 100).toFixed(0) : 0}%</span>)}</div></div>
                  </div>

                  <div className="mb-5 rounded-[8px] border border-white/[.08] bg-black/10 p-4">
                    <div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[.12em] text-[var(--text-tertiary)]">Transaction history</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Holding edits are recorded automatically.</p></div><span className="font-mono text-xs text-[var(--text-tertiary)]">{portfolioTransactions[activePortfolio]?.length ?? 0} records</span></div>
                    {(portfolioTransactions[activePortfolio]?.length ?? 0) > 0 ? <div className="divide-y divide-white/[.06]">{portfolioTransactions[activePortfolio].slice(0, 5).map(transaction => <div key={transaction.id} className="grid grid-cols-[1fr_auto_auto] gap-4 py-2 text-xs"><span className="font-semibold text-white">{transaction.ticker} <span className={transaction.type === 'buy' ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}>{transaction.type.toUpperCase()}</span></span><span className="font-mono text-[var(--text-secondary)]">{transaction.quantity.toFixed(4).replace(/\.?0+$/, '')} @ ${transaction.price.toFixed(2)}</span><time className="text-[var(--text-tertiary)]">{new Date(transaction.date).toLocaleDateString()}</time></div>)}</div> : <p className="py-3 text-xs text-[var(--text-tertiary)]">Edit a holding to create the first transaction.</p>}
                  </div>

                  <div className="overflow-hidden border border-white/[.07] rounded-[7px]">
                    <table className="data-table min-w-full border-separate border-spacing-0 text-left text-[#a2aaa4]">
                      <thead className="bg-black/20">
                        <tr>
                          {['Symbol / Company', 'Sector', 'Shares', 'Last Price', 'Market Value', 'Day P/L', 'Day P/L %', 'Total P/L', 'Actions'].map((header) => (
                            <th key={header} className={`border-b border-white/[.07] px-4 py-3 whitespace-nowrap ${['Symbol / Company', 'Sector'].includes(header) ? '!text-left' : ''}`}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                            {(filteredStocks ?? []).filter(stock => (portfolioQuantities[activePortfolio]?.[stock.ticker] ?? 0) > 0).map((stock) => {
                          const quantity = portfolioQuantities[activePortfolio]?.[stock.ticker] ?? 0;
                          const marketValue = stock.currentPrice * quantity;
                          const dayChange = stock.currentPrice - stock.previousClose;
                          const dayPnL = dayChange * quantity;
                          const dayPnLPercent = stock.previousClose > 0 ? (dayChange / stock.previousClose) * 100 : 0;
                          const totalCost = stock.currentPrice * quantity;
                          const totalPnL = marketValue - totalCost;

                          const company = getCompanyMetadata(stock.ticker, stock.name);

                          return (
                            <tr
                              key={stock.ticker}
                              className={`hover:bg-white/[.04] ${stock.ticker === selectedTicker ? 'bg-white/[.035]' : ''}`}
                              onClick={() => setSelectedTicker(stock.ticker)}
                            >
                              <td className={`min-w-[220px] border-l-2 px-4 py-3 !text-left ${stock.ticker === selectedTicker ? 'border-lime-300' : 'border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                  <CompanyMark ticker={stock.ticker} size={28} />
                                  <div className="min-w-0">
                                    <div className="font-semibold text-white">{stock.ticker}</div>
                                    <div className="truncate text-xs text-[var(--text-secondary)]">{company.name}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 !text-left">{stock.sector}</td>
                              <td className="px-4 py-3">{quantity}</td>
                              <td className="px-4 py-3 text-white">${stock.currentPrice.toFixed(2)}</td>
                              <td className="px-4 py-3 text-white">${marketValue.toFixed(2)}</td>
                              <td className={`px-4 py-3 font-medium ${dayPnL >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                                {dayPnL >= 0 ? '+' : '-'}${Math.abs(dayPnL).toFixed(2)}
                              </td>
                              <td className={`px-4 py-3 font-medium ${dayPnLPercent >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>{dayPnLPercent >= 0 ? '+' : ''}{dayPnLPercent.toFixed(2)}%</td>
                              <td className={`px-4 py-3 font-medium ${totalPnL >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                                {totalPnL >= 0 ? '+' : '-'}${Math.abs(totalPnL).toFixed(2)}
                              </td>
                              <td className="px-4 py-3">
                                <button type="button" aria-label={`Edit ${stock.ticker} holding`} onClick={(event) => { event.stopPropagation(); handleShareEdit(stock.ticker); }} className="grid h-8 w-8 place-items-center rounded-[6px] text-[var(--text-secondary)] hover:bg-white/[.07] hover:text-white"><MoreHorizontal className="h-4 w-4" /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tableTab === 'holdings' && (
                <table className="data-table min-w-full border-separate border-spacing-0 text-left text-[#a2aaa4]">
                  <thead className="bg-black/20">
                    <tr>
                      {['Symbol', 'Status', 'Shares', 'Last Price', 'AC/Share', 'Total Cost ($)', 'Market Value ($)', 'Tot Div Income ($)', 'Day Gain Unrl (%)', 'Day Gain Unrl ($)', 'Tot Gain Unrl (%)', 'Tot Gain Unrl ($)', 'Realized Gain (%)', 'Realized Gain ($)'].map((header) => (
                        <th key={header} className="border-b border-white/[.07] px-3 py-3 whitespace-nowrap">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stocksData.map((stock) => {
                      const quantity = portfolioQuantities[activePortfolio]?.[stock.ticker] ?? 0;
                      const isHolding = quantity > 0;
                      const holdingMetrics = getHoldingMetrics(stock, quantity);

                      return (
                        <tr
                          key={stock.ticker}
                          className={`hover:bg-white/[.035] ${stock.ticker === selectedTicker ? 'bg-white/[.045]' : ''}`}
                          onClick={() => setSelectedTicker(stock.ticker)}
                        >
                          <td className={`border-l-2 px-3 py-3 !text-left ${stock.ticker === selectedTicker ? 'border-lime-300' : 'border-transparent'}`}>
                            <div className="flex min-w-[168px] items-center gap-2.5">
                              <CompanyMark ticker={stock.ticker} size={24} />
                              <div>
                                <div className="font-semibold text-white">{stock.ticker}</div>
                                <div className="max-w-[130px] truncate text-[11px] text-[var(--text-secondary)]">{getCompanyMetadata(stock.ticker, stock.name).name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-300">{holdingMetrics.status}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleShareEdit(stock.ticker);
                                }}
                                className="rounded-[5px] border border-white/[.1] bg-white/[.03] px-2 py-1 text-xs font-medium text-[#a2aaa4] hover:border-white/20 hover:text-white"
                              >
                                {isHolding ? 'Edit' : 'Add'}
                              </button>
                              <span className="text-xs text-slate-400">{holdingMetrics.shares}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-white">${stock.currentPrice.toFixed(2)}</td>
                          <td className="px-3 py-3">{holdingMetrics.hasHolding ? `$${holdingMetrics.avgCostPerShare.toFixed(2)}` : '--'}</td>
                          <td className="px-3 py-3">{holdingMetrics.hasHolding ? `$${holdingMetrics.totalCost.toFixed(2)}` : '--'}</td>
                          <td className="px-3 py-3 text-white">{holdingMetrics.hasHolding ? `$${holdingMetrics.marketValue.toFixed(2)}` : '--'}</td>
                          <td className="px-3 py-3">{holdingMetrics.hasHolding ? `$${holdingMetrics.totalDivIncome.toFixed(2)}` : '--'}</td>
                          <td className={`px-3 py-3 font-medium ${holdingMetrics.dayGainPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {holdingMetrics.hasHolding ? `${holdingMetrics.dayGainPct >= 0 ? '+' : ''}${holdingMetrics.dayGainPct.toFixed(2)}%` : '--'}
                          </td>
                          <td className={`px-3 py-3 font-medium ${holdingMetrics.dayGainDollar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {holdingMetrics.hasHolding ? `${holdingMetrics.dayGainDollar >= 0 ? '+' : '-'}$${Math.abs(holdingMetrics.dayGainDollar).toFixed(2)}` : '--'}
                          </td>
                          <td className={`px-3 py-3 font-medium ${holdingMetrics.totalGainPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {holdingMetrics.hasHolding ? `${holdingMetrics.totalGainPct >= 0 ? '+' : ''}${holdingMetrics.totalGainPct.toFixed(2)}%` : '--'}
                          </td>
                          <td className={`px-3 py-3 font-medium ${holdingMetrics.totalGainDollar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {holdingMetrics.hasHolding ? `${holdingMetrics.totalGainDollar >= 0 ? '+' : '-'}$${Math.abs(holdingMetrics.totalGainDollar).toFixed(2)}` : '--'}
                          </td>
                          <td className="px-3 py-3">{holdingMetrics.hasHolding ? `${holdingMetrics.realizedGainPct >= 0 ? '+' : ''}${holdingMetrics.realizedGainPct.toFixed(2)}%` : '--'}</td>
                          <td className="px-3 py-3">{holdingMetrics.hasHolding ? `${holdingMetrics.realizedGainDollar >= 0 ? '+' : '-'}$${Math.abs(holdingMetrics.realizedGainDollar).toFixed(2)}` : '--'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tableTab === 'fundamentals' && (
                <table className="data-table min-w-full border-separate border-spacing-0 text-left text-[#a2aaa4]">
                  <caption className="border-b border-amber-300/15 bg-amber-300/[.04] px-4 py-3 text-left text-xs text-amber-200/80">Estimated demo fundamentals · values other than last price and volume are illustrative and are not live filings data.</caption>
                  <thead className="bg-black/20">
                    <tr>
                      {['Symbol', 'Last Price', 'Market Cap', 'Avg Vol (3M)', 'EPS Est. Next Yr', 'Forward P/E', 'Div Paymt Date', 'Ex-Div Date', 'Div/Share', 'Fwd Ann Div Rate', 'Fwd Ann Div Yield', 'Ttl Ann Div Rate', 'Ttl Ann Div Yield', 'Price / Book'].map((header) => (
                        <th key={header} className="border-b border-white/[.07] px-3 py-3 whitespace-nowrap">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stocksData.map((stock) => {
                      const fundamentals = getFundamentalMetrics(stock);

                      return (
                        <tr
                          key={stock.ticker}
                          className={`hover:bg-white/[.035] ${stock.ticker === selectedTicker ? 'bg-white/[.045]' : ''}`}
                          onClick={() => setSelectedTicker(stock.ticker)}
                        >
                          <td className={`border-l-2 px-3 py-3 !text-left ${stock.ticker === selectedTicker ? 'border-lime-300' : 'border-transparent'}`}>
                            <div className="flex items-center gap-2.5"><CompanyMark ticker={stock.ticker} size={24} /><span className="font-semibold text-white">{stock.ticker}</span></div>
                          </td>
                          <td className="px-3 py-3 text-white">{stock.currentPrice.toFixed(2)}</td>
                          <td className="px-3 py-3">{formatCompactNumber(fundamentals.marketCap)}</td>
                          <td className="px-3 py-3">{formatCompactNumber(fundamentals.avgVolume)}</td>
                          <td className="px-3 py-3">{fundamentals.epsEstimate.toFixed(2)}</td>
                          <td className="px-3 py-3">{fundamentals.forwardPe.toFixed(2)}</td>
                          <td className="px-3 py-3">{fundamentals.divPaymentDate}</td>
                          <td className="px-3 py-3">{fundamentals.exDivDate}</td>
                          <td className="px-3 py-3">{fundamentals.divPerShare.toFixed(2)}</td>
                          <td className="px-3 py-3">{fundamentals.fwdAnnDivRate.toFixed(2)}</td>
                          <td className="px-3 py-3">{fundamentals.fwdAnnDivYield.toFixed(2)}%</td>
                          <td className="px-3 py-3">{fundamentals.ttlAnnDivRate.toFixed(2)}</td>
                          <td className="px-3 py-3">{fundamentals.ttlAnnDivYield.toFixed(2)}%</td>
                          <td className="px-3 py-3">{fundamentals.priceToBook.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tableTab === 'performance' && (
                <table className="data-table min-w-full border-separate border-spacing-0 text-left text-[#a2aaa4]">
                  <thead className="bg-black/20">
                    <tr>
                      {['Symbol', '1D', '1W', '1M', '3M', 'YTD', '1Y'].map((header) => (
                        <th key={header} className="border-b border-white/[.07] px-3 py-3 whitespace-nowrap">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stocksData.map((stock) => {
                      const oneDay = ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100;
                      const oneWeek = getPeriodReturn(stock, 5);
                      const oneMonth = getPeriodReturn(stock, 21);
                      const threeMonth = getPeriodReturn(stock, 63);
                      const firstYtdIndex = stock.historicalData.findIndex(point => new Date(point.date).getFullYear() === new Date().getFullYear());
                      const firstYtd = firstYtdIndex >= 0 ? stock.historicalData[firstYtdIndex].close : stock.historicalData[0]?.close;
                      const ytd = firstYtd ? ((stock.currentPrice - firstYtd) / firstYtd) * 100 : 0;
                      const oneYear = getPeriodReturn(stock, 252);

                      return (
                        <tr
                          key={stock.ticker}
                          className={`hover:bg-white/[.035] ${stock.ticker === selectedTicker ? 'bg-white/[.045]' : ''}`}
                          onClick={() => setSelectedTicker(stock.ticker)}
                        >
                          <td className={`border-l-2 px-3 py-3 !text-left ${stock.ticker === selectedTicker ? 'border-lime-300' : 'border-transparent'}`}>
                            <div className="flex items-center gap-2.5"><CompanyMark ticker={stock.ticker} size={24} /><span className="font-semibold text-white">{stock.ticker}</span></div>
                          </td>
                          <td className={`px-3 py-3 font-medium ${oneDay >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{oneDay.toFixed(2)}%</td>
                          <td className={`px-3 py-3 font-medium ${oneWeek >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{oneWeek.toFixed(2)}%</td>
                          <td className={`px-3 py-3 font-medium ${oneMonth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{oneMonth.toFixed(2)}%</td>
                          <td className={`px-3 py-3 font-medium ${threeMonth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{threeMonth.toFixed(2)}%</td>
                          <td className={`px-3 py-3 font-medium ${ytd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{ytd.toFixed(2)}%</td>
                          <td className={`px-3 py-3 font-medium ${oneYear >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{oneYear.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {primaryView === 'watchlist' && stocksData && viewMode === 'cards' && (
          <>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[.2em] text-[#69716b] mb-1.5">Watchlist</p>
              <h2 className="text-2xl font-semibold tracking-[-.04em] text-white">Market overview</h2>
            </div>
            <p className="hidden sm:block text-xs text-[#69716b]">Select a symbol to inspect</p>
          </div>
          <div className="mb-6 grid min-w-0 grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:mb-8 xl:grid-cols-4">
            {stocksData.map((stock) => {
              const stockAnalysis = analyzeStock(stock.historicalData, stock.hasRealHistory);
              return (
                <div key={stock.ticker} className="group relative min-w-0">
                  <StockCard
                    stock={stock}
                    analysis={stockAnalysis}
                    isSelected={stock.ticker === selectedTicker}
                    onClick={() => setSelectedTicker(stock.ticker)}
                  />
                  {activeTickers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStock(stock.ticker);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded bg-black/40 hover:bg-rose-500/20 text-[#89918b] hover:text-rose-400"
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
              className="p-4 rounded-[10px] border border-dashed border-white/[.12] hover:border-lime-300/40 hover:bg-lime-300/[.025] transition-all flex flex-col items-center justify-center gap-2 min-h-[148px]"
            >
              <Plus className="w-5 h-5 text-[#69716b]" />
              <span className="text-xs text-[#89918b]">Add symbol</span>
            </button>
          </div>
          </>
        )}

        {primaryView === 'watchlist' && selectedStock && analysis && (
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
                onClick={() => setActiveTab('chart')}
                aria-pressed={activeTab === 'chart'}
                className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
                  activeTab === 'chart' ? 'border-lime-300 text-lime-200' : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <LineChart className="w-4 h-4" />
                Price Chart
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                aria-pressed={activeTab === 'analysis'}
                className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
                  activeTab === 'analysis' ? 'border-lime-300 text-lime-200' : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                Analysis
              </button>
              <button
                onClick={() => setActiveTab('forecast')}
                aria-pressed={activeTab === 'forecast'}
                className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
                  activeTab === 'forecast' ? 'border-lime-300 text-lime-200' : 'border-transparent text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Forecast
              </button>
              <button
                onClick={() => setActiveTab('compare')}
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
                  <Suspense fallback={<PanelFallback />}><CandlestickChart
                      data={selectedStock.historicalData}
                      analysis={analysis}
                      ticker={selectedStock.ticker}
                    /></Suspense>

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
                <Suspense fallback={<PanelFallback />}><FinancialForecaster
                  cagr={cagr}
                  ticker={selectedStock.ticker}
                  isLiveData={selectedStock.isLiveData}
                /></Suspense>
              )}
              {activeTab === 'compare' && <Suspense fallback={<PanelFallback />}><ComparisonPanel stocks={stocksData ?? []} /></Suspense>}
            </div>
            </section>
            <LatestNewsPanel ticker={selectedStock.ticker} items={stockNews} loading={newsLoading} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-10 border-t border-white/[.07] py-6">
        <div className="mx-auto w-[calc(100%-24px)] max-w-[1680px] sm:w-[calc(100%-32px)] xl:w-[calc(100%-48px)]">
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
            <div className="mt-3 pt-3 border-t border-[#e4b75c]/20">
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
        existingTickers={activeTickers}
      />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSubmit={handleAuth} onResend={handleResendConfirmation} />
      <HoldingModal
        ticker={editingTicker}
        initialQuantity={editingTicker ? (portfolioQuantities[activePortfolio]?.[editingTicker] ?? 0) : 0}
        initialAverageCost={editingTicker ? (portfolioAverageCosts[activePortfolio]?.[editingTicker] ?? stocksData?.find(stock => stock.ticker === editingTicker)?.currentPrice ?? 0) : 0}
        onClose={() => setEditingTicker(null)}
        onSave={(quantity, averageCost) => {
          if (!editingTicker) return;
          const previousQuantity = portfolioQuantities[activePortfolio]?.[editingTicker] ?? 0;
          const delta = quantity - previousQuantity;
          if (Math.abs(delta) > 0.000001) {
            setPortfolioTransactions(prev => ({
              ...prev,
              [activePortfolio]: [{ id: `${Date.now()}-${editingTicker}`, ticker: editingTicker, type: delta > 0 ? 'buy' : 'sell', quantity: Math.abs(delta), price: averageCost, date: new Date().toISOString() }, ...(prev[activePortfolio] ?? [])],
            }));
          }
          updateStockQuantity(editingTicker, quantity);
          setPortfolioAverageCosts(prev => ({ ...prev, [activePortfolio]: { ...(prev[activePortfolio] ?? {}), [editingTicker]: averageCost } }));
          setNotice(`${editingTicker} holding updated.`);
        }}
      />
    </div>
  );
}
