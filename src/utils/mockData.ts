// Real Stock Data Service for StockSight
// Uses multiple API sources with intelligent fallback

export interface StockDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockInfo {
  ticker: string;
  name: string;
  sector: string;
  currentPrice: number;
  previousClose: number;
  historicalData: StockDataPoint[];
  lastUpdated: string;
  isLiveData: boolean;
  dataSource: string;
}

// ============================================
// API SOURCES (in order of preference)
// ============================================

// Source 1: Alpha Vantage (Free tier, CORS-enabled)
const ALPHA_VANTAGE_KEY = 'demo';
async function fetchFromAlphaVantage(symbol: string): Promise<StockDataPoint[] | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}&outputsize=full`;
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const json = await response.json();
    const timeSeries = json['Time Series (Daily)'];
    if (!timeSeries) return null;
    
    const result: StockDataPoint[] = [];
    const dates = Object.keys(timeSeries).sort().reverse().slice(0, 365);
    
    for (const date of dates) {
      const dayData = timeSeries[date];
      result.push({
        date,
        open: parseFloat(dayData['1. open']),
        high: parseFloat(dayData['2. high']),
        low: parseFloat(dayData['3. low']),
        close: parseFloat(dayData['4. close']),
        volume: parseInt(dayData['5. volume']),
      });
    }
    
    return result.length > 50 ? result.reverse() : null;
  } catch (e) {
    console.warn('Alpha Vantage failed:', e);
    return null;
  }
}

// Source 2: Yahoo Finance via CORS proxy
async function fetchFromYahooFinance(symbol: string): Promise<StockDataPoint[] | null> {
  const proxies = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  ];
  
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`;
  
  for (const proxyFn of proxies) {
    try {
      const url = proxyFn(yahooUrl);
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) continue;
      
      const json = await response.json();
      const result = json?.chart?.result?.[0];
      if (!result?.timestamp) continue;
      
      const timestamps: number[] = result.timestamp;
      const quote = result.indicators?.quote?.[0];
      if (!quote) continue;
      
      const { open, high, low, close, volume } = quote;
      const data: StockDataPoint[] = [];
      
      for (let i = 0; i < timestamps.length; i++) {
        if (open[i] == null || close[i] == null) continue;
        
        const date = new Date(timestamps[i] * 1000);
        data.push({
          date: date.toISOString().split('T')[0],
          open: Math.round(open[i] * 100) / 100,
          high: Math.round(high[i] * 100) / 100,
          low: Math.round(low[i] * 100) / 100,
          close: Math.round(close[i] * 100) / 100,
          volume: volume[i] || 0,
        });
      }
      
      if (data.length > 50) return data;
    } catch (e) {
      console.warn(`Yahoo proxy failed, trying next...`);
      continue;
    }
  }
  
  return null;
}

// Source 3: Finnhub (Free tier, supports CORS)
const FINNHUB_KEY = 'demo';
async function fetchFromFinnhub(symbol: string): Promise<StockDataPoint[] | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const oneYearAgo = now - (365 * 24 * 60 * 60);
    
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${oneYearAgo}&to=${now}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const json = await response.json();
    if (json.s !== 'ok' || !json.c) return null;
    
    const data: StockDataPoint[] = [];
    for (let i = 0; i < json.t.length; i++) {
      const date = new Date(json.t[i] * 1000);
      data.push({
        date: date.toISOString().split('T')[0],
        open: json.o[i],
        high: json.h[i],
        low: json.l[i],
        close: json.c[i],
        volume: json.v[i] || 0,
      });
    }
    
    return data.length > 50 ? data : null;
  } catch (e) {
    console.warn('Finnhub failed:', e);
    return null;
  }
}

// Get real-time quote
async function fetchRealtimeQuote(symbol: string): Promise<{ price: number; previousClose: number; name: string } | null> {
  // Try Alpha Vantage
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const response = await fetch(url);
    if (response.ok) {
      const json = await response.json();
      const quote = json['Global Quote'];
      if (quote && quote['05. price']) {
        return {
          price: parseFloat(quote['05. price']),
          previousClose: parseFloat(quote['08. previous close']),
          name: symbol,
        };
      }
    }
  } catch (e) {
    console.warn('Alpha Vantage quote failed');
  }
  
  // Try Finnhub
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    if (response.ok) {
      const json = await response.json();
      if (json.c) {
        return {
          price: json.c,
          previousClose: json.pc,
          name: symbol,
        };
      }
    }
  } catch (e) {
    console.warn('Finnhub quote failed');
  }
  
  return null;
}

// ============================================
// MOCK DATA FALLBACK
// ============================================

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateMockHistoricalData(
  basePrice: number,
  volatility: number,
  trend: number,
  days: number = 365
): StockDataPoint[] {
  const result: StockDataPoint[] = [];
  const random = seededRandom(basePrice * 1000 + days);
  let price = basePrice * 0.7;

  const endDate = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dailyReturn = (random() - 0.48) * volatility + trend / 252;
    price = price * (1 + dailyReturn);
    
    const dayVolatility = random() * volatility * 0.5;
    const open = price * (1 + (random() - 0.5) * dayVolatility);
    const close = price;
    const high = Math.max(open, close) * (1 + random() * dayVolatility * 0.5);
    const low = Math.min(open, close) * (1 - random() * dayVolatility * 0.5);
    const volume = Math.floor(20000000 + random() * 80000000);

    result.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });
  }

  return result;
}

const STOCK_CONFIGS: Record<string, { name: string; sector: string; basePrice: number; volatility: number; trend: number }> = {
  AAPL: { name: 'Apple Inc.', sector: 'Technology', basePrice: 195, volatility: 0.02, trend: 0.15 },
  MSFT: { name: 'Microsoft Corporation', sector: 'Technology', basePrice: 420, volatility: 0.018, trend: 0.20 },
  NVDA: { name: 'NVIDIA Corporation', sector: 'Technology', basePrice: 880, volatility: 0.035, trend: 0.45 },
  GOOGL: { name: 'Alphabet Inc.', sector: 'Technology', basePrice: 175, volatility: 0.022, trend: 0.12 },
  AMZN: { name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', basePrice: 185, volatility: 0.025, trend: 0.18 },
  TSLA: { name: 'Tesla Inc.', sector: 'Automotive', basePrice: 245, volatility: 0.04, trend: 0.10 },
  META: { name: 'Meta Platforms Inc.', sector: 'Technology', basePrice: 510, volatility: 0.028, trend: 0.25 },
  JPM: { name: 'JPMorgan Chase & Co.', sector: 'Financial Services', basePrice: 198, volatility: 0.015, trend: 0.10 },
};

// ============================================
// MAIN DATA FETCHER
// ============================================

export async function getStockInfo(ticker: string): Promise<StockInfo> {
  const upperTicker = ticker.toUpperCase();
  
  const [alphaVantageData, yahooData, finnhubData, quote] = await Promise.all([
    fetchFromAlphaVantage(upperTicker),
    fetchFromYahooFinance(upperTicker),
    fetchFromFinnhub(upperTicker),
    fetchRealtimeQuote(upperTicker),
  ]);
  
  const chartData = alphaVantageData || yahooData || finnhubData;
  
  if (chartData && chartData.length > 50) {
    const currentPrice = quote?.price || chartData[chartData.length - 1].close;
    const previousClose = quote?.previousClose || chartData[chartData.length - 2].close;
    const name = quote?.name || STOCK_CONFIGS[upperTicker]?.name || `${upperTicker} Corp.`;
    
    let dataSource = 'Unknown';
    if (alphaVantageData) dataSource = 'Alpha Vantage';
    else if (yahooData) dataSource = 'Yahoo Finance';
    else if (finnhubData) dataSource = 'Finnhub';
    
    return {
      ticker: upperTicker,
      name,
      sector: STOCK_CONFIGS[upperTicker]?.sector || 'Unknown',
      currentPrice,
      previousClose,
      historicalData: chartData,
      lastUpdated: new Date().toISOString(),
      isLiveData: true,
      dataSource,
    };
  }
  
  console.warn(`All API sources failed for ${upperTicker}, using mock data`);
  return getMockStockInfo(upperTicker);
}

function getMockStockInfo(ticker: string): StockInfo {
  const config = STOCK_CONFIGS[ticker];
  
  if (config) {
    const historicalData = generateMockHistoricalData(config.basePrice, config.volatility, config.trend);
    return {
      ticker,
      name: config.name,
      sector: config.sector,
      currentPrice: historicalData[historicalData.length - 1].close,
      previousClose: historicalData[historicalData.length - 2].close,
      historicalData,
      lastUpdated: new Date().toISOString(),
      isLiveData: false,
      dataSource: 'Mock Data (API unavailable)',
    };
  }
  
  const random = seededRandom(ticker.charCodeAt(0) * 100 + ticker.charCodeAt(1));
  const basePrice = 50 + random() * 400;
  const historicalData = generateMockHistoricalData(basePrice, 0.025, 0.10);
  return {
    ticker,
    name: `${ticker} Corp.`,
    sector: 'Unknown',
    currentPrice: historicalData[historicalData.length - 1].close,
    previousClose: historicalData[historicalData.length - 2].close,
    historicalData,
    lastUpdated: new Date().toISOString(),
    isLiveData: false,
    dataSource: 'Mock Data (API unavailable)',
  };
}

export const STARTER_STOCKS: string[] = ['AAPL', 'MSFT', 'NVDA'];

export function getAllAvailableTickers(): string[] {
  return Object.keys(STOCK_CONFIGS);
}

export function simulatePriceUpdate(stock: StockInfo): StockInfo {
  if (stock.isLiveData) {
    const change = (Math.random() - 0.5) * 0.001;
    const newPrice = Math.round(stock.currentPrice * (1 + change) * 100) / 100;
    return { ...stock, currentPrice: newPrice };
  }
  
  const change = (Math.random() - 0.5) * 0.002;
  const newPrice = Math.round(stock.currentPrice * (1 + change) * 100) / 100;
  return { ...stock, currentPrice: newPrice };
}
