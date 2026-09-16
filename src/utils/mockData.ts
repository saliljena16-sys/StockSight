// Real Stock Data Service for StockSight
// Fetches live data from Yahoo Finance API via CORS proxy
// Falls back to mock data if API is unavailable

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
  data: StockDataPoint[];
  lastUpdated: string;
  isLiveData: boolean;
}

// CORS proxies to try (in order of preference)
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

// Yahoo Finance API endpoints
function getYahooChartUrl(symbol: string, range: string = '1y', interval: string = '1d'): string {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includePrePost=false`;
}

function getYahooQuoteUrl(symbols: string[]): string {
  return `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`;
}

// Fetch real historical data from Yahoo Finance
async function fetchYahooChartData(symbol: string): Promise<StockDataPoint[] | null> {
  for (const proxyFn of CORS_PROXIES) {
    try {
      const url = proxyFn(getYahooChartUrl(symbol, '1y', '1d'));
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) continue;
      
      const json = await response.json();
      
      // Parse Yahoo Finance chart response
      const result = json?.chart?.result?.[0];
      if (!result) continue;
      
      const timestamps: number[] = result.timestamp || [];
      const quote = result.indicators?.quote?.[0];
      if (!quote || !timestamps.length) continue;
      
      const { open, high, low, close, volume } = quote;
      const data: StockDataPoint[] = [];
      
      for (let i = 0; i < timestamps.length; i++) {
        // Skip null values (market holidays, etc.)
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
      
      if (data.length > 0) return data;
    } catch (e) {
      console.warn(`CORS proxy failed for ${symbol}, trying next...`, e);
      continue;
    }
  }
  
  return null;
}

// Fetch real-time quote from Yahoo Finance
async function fetchYahooQuote(symbol: string): Promise<{ price: number; previousClose: number; name: string } | null> {
  for (const proxyFn of CORS_PROXIES) {
    try {
      const url = proxyFn(getYahooQuoteUrl([symbol]));
      const response = await fetch(url);
      
      if (!response.ok) continue;
      
      const json = await response.json();
      const quote = json?.quoteResponse?.result?.[0];
      
      if (!quote) continue;
      
      return {
        price: quote.regularMarketPrice || quote.postMarketPrice || 0,
        previousClose: quote.regularMarketPreviousClose || 0,
        name: quote.longName || quote.shortName || symbol,
      };
    } catch (e) {
      console.warn(`Quote fetch failed for ${symbol}, trying next proxy...`, e);
      continue;
    }
  }
  
  return null;
}

// ============================================
// MOCK DATA FALLBACK (used when API is unavailable)
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
  const data: StockDataPoint[] = [];
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

    data.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });
  }

  return data;
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
  AMD: { name: 'Advanced Micro Devices', sector: 'Technology', basePrice: 165, volatility: 0.032, trend: 0.20 },
  NFLX: { name: 'Netflix Inc.', sector: 'Communication Services', basePrice: 680, volatility: 0.025, trend: 0.22 },
};

// ============================================
// MAIN DATA FETCHER
// ============================================

export async function getStockInfo(ticker: string): Promise<StockInfo> {
  const upperTicker = ticker.toUpperCase();
  
  // Try to fetch real data
  try {
    const [chartData, quote] = await Promise.all([
      fetchYahooChartData(upperTicker),
      fetchYahooQuote(upperTicker),
    ]);
    
    if (chartData && chartData.length > 50) {
      const currentPrice = quote?.price || chartData[chartData.length - 1].close;
      const previousClose = quote?.previousClose || chartData[chartData.length - 2].close;
      const name = quote?.name || STOCK_CONFIGS[upperTicker]?.name || `${upperTicker} Corp.`;
      
      return {
        ticker: upperTicker,
        name,
        sector: STOCK_CONFIGS[upperTicker]?.sector || 'Unknown',
        currentPrice,
        previousClose,
        data: chartData,
        lastUpdated: new Date().toISOString(),
        isLiveData: true,
      };
    }
  } catch (e) {
    console.warn(`Failed to fetch live data for ${upperTicker}, using mock data`, e);
  }
  
  // Fallback to mock data
  return getMockStockInfo(upperTicker);
}

function getMockStockInfo(ticker: string): StockInfo {
  const config = STOCK_CONFIGS[ticker];
  
  if (config) {
    const data = generateMockHistoricalData(config.basePrice, config.volatility, config.trend);
    return {
      ticker,
      name: config.name,
      sector: config.sector,
      currentPrice: data[data.length - 1].close,
      previousClose: data[data.length - 2].close,
      data,
      lastUpdated: new Date().toISOString(),
      isLiveData: false,
    };
  }
  
  // Unknown ticker - generate random
  const random = seededRandom(ticker.charCodeAt(0) * 100 + ticker.charCodeAt(1));
  const basePrice = 50 + random() * 400;
  const data = generateMockHistoricalData(basePrice, 0.025, 0.10);
  return {
    ticker,
    name: `${ticker} Corp.`,
    sector: 'Unknown',
    currentPrice: data[data.length - 1].close,
    previousClose: data[data.length - 2].close,
    data,
    lastUpdated: new Date().toISOString(),
    isLiveData: false,
  };
}

export const STARTER_STOCKS: string[] = ['AAPL', 'MSFT', 'NVDA'];

export function getAllAvailableTickers(): string[] {
  return Object.keys(STOCK_CONFIGS);
}

// Simulate small price movements for "live" feel between API refreshes
export function simulatePriceUpdate(stock: StockInfo): StockInfo {
  if (stock.isLiveData) {
    // For live data, just add tiny movements
    const change = (Math.random() - 0.5) * 0.001;
    const newPrice = Math.round(stock.currentPrice * (1 + change) * 100) / 100;
    return { ...stock, currentPrice: newPrice };
  }
  
  // For mock data, simulate more movement
  const change = (Math.random() - 0.5) * 0.002;
  const newPrice = Math.round(stock.currentPrice * (1 + change) * 100) / 100;
  return { ...stock, currentPrice: newPrice };
}
