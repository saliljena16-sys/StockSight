// Mock Data Generator for StockSight
// In production, replace with real API calls to AlphaVantage, Finnhub, or Yahoo Finance
// Example: const fetcher = (url: string) => fetch(url).then(res => res.json())
// Then use SWR: const { data } = useSWR(`/api/stocks/${ticker}`, fetcher)

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
}

// Seed-based pseudo-random for consistent mock data
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateHistoricalData(
  basePrice: number,
  volatility: number,
  trend: number,
  days: number = 365
): StockDataPoint[] {
  const data: StockDataPoint[] = [];
  const random = seededRandom(basePrice * 1000 + days);
  let price = basePrice * 0.7; // Start lower to show growth

  const endDate = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    
    // Skip weekends
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

const STOCK_CONFIGS = {
  AAPL: {
    name: 'Apple Inc.',
    sector: 'Technology',
    basePrice: 195,
    volatility: 0.02,
    trend: 0.15,
  },
  MSFT: {
    name: 'Microsoft Corporation',
    sector: 'Technology',
    basePrice: 420,
    volatility: 0.018,
    trend: 0.20,
  },
  NVDA: {
    name: 'NVIDIA Corporation',
    sector: 'Technology',
    basePrice: 880,
    volatility: 0.035,
    trend: 0.45,
  },
  GOOGL: {
    name: 'Alphabet Inc.',
    sector: 'Technology',
    basePrice: 175,
    volatility: 0.022,
    trend: 0.12,
  },
  AMZN: {
    name: 'Amazon.com Inc.',
    sector: 'Consumer Cyclical',
    basePrice: 185,
    volatility: 0.025,
    trend: 0.18,
  },
  TSLA: {
    name: 'Tesla Inc.',
    sector: 'Automotive',
    basePrice: 245,
    volatility: 0.04,
    trend: 0.10,
  },
  META: {
    name: 'Meta Platforms Inc.',
    sector: 'Technology',
    basePrice: 510,
    volatility: 0.028,
    trend: 0.25,
  },
  JPM: {
    name: 'JPMorgan Chase & Co.',
    sector: 'Financial Services',
    basePrice: 198,
    volatility: 0.015,
    trend: 0.10,
  },
};

export type StockTicker = keyof typeof STOCK_CONFIGS;

export function getStockInfo(ticker: string): StockInfo {
  const config = STOCK_CONFIGS[ticker as StockTicker];
  if (!config) {
    // Generate random stock for unknown tickers
    const random = seededRandom(ticker.charCodeAt(0) * 100 + ticker.charCodeAt(1));
    const basePrice = 50 + random() * 400;
    const data = generateHistoricalData(basePrice, 0.025, 0.10);
    return {
      ticker,
      name: `${ticker} Corp.`,
      sector: 'Unknown',
      currentPrice: data[data.length - 1].close,
      previousClose: data[data.length - 2].close,
      data,
    };
  }

  const data = generateHistoricalData(config.basePrice, config.volatility, config.trend);
  
  return {
    ticker,
    name: config.name,
    sector: config.sector,
    currentPrice: data[data.length - 1].close,
    previousClose: data[data.length - 2].close,
    data,
  };
}

export const STARTER_STOCKS: string[] = ['AAPL', 'MSFT', 'NVDA'];

export function getAllAvailableTickers(): string[] {
  return Object.keys(STOCK_CONFIGS);
}

// Simulate live price updates (small random walks)
export function simulatePriceUpdate(stock: StockInfo): StockInfo {
  const lastPoint = stock.data[stock.data.length - 1];
  const random = Math.random();
  const change = (random - 0.5) * 0.002;
  const newClose = Math.round(lastPoint.close * (1 + change) * 100) / 100;
  
  return {
    ...stock,
    currentPrice: newClose,
    previousClose: lastPoint.close,
  };
}
