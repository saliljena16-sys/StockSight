// Stock data fetching utilities
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
  volume: number;
  historicalData: StockDataPoint[];
  lastUpdated: string;
  isLiveData: boolean;
  dataSource: string;
  hasRealHistory: boolean;
}

// Mock data generator for demo purposes
function createSeededRandom(seedText: string) {
  let seed = Array.from(seedText).reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function generateMockData(ticker: string, days: number = 365): StockDataPoint[] {
  const data: StockDataPoint[] = [];
  const random = createSeededRandom(`${ticker}-${new Date().toISOString().slice(0, 10)}`);
  const basePrice = 100 + random() * 200;
  let price = basePrice;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const change = (random() - 0.5) * 0.04;
    price = price * (1 + change);
    
    const open = price * (1 + (random() - 0.5) * 0.02);
    const close = price;
    const high = Math.max(open, close) * (1 + random() * 0.02);
    const low = Math.min(open, close) * (1 - random() * 0.02);
    const volume = Math.floor(1000000 + random() * 10000000);
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume
    });
  }
  
  return data;
}

const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY || '';
const HISTORY_CACHE_MS = 6 * 60 * 60 * 1000;
const historyCache = new Map<string, { data: StockDataPoint[]; source: string; fetchedAt: number }>();

const KNOWN_SECTOR_MAP: Record<string, string> = {
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

async function getTickerSector(ticker: string): Promise<string> {
  const t = ticker.toUpperCase();

  if (KNOWN_SECTOR_MAP[t]) {
    return KNOWN_SECTOR_MAP[t];
  }

  if (!FINNHUB_API_KEY) {
    return 'Unknown';
  }

  try {
    const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${t}&token=${FINNHUB_API_KEY}`;
    const profileResponse = await fetch(profileUrl);

    if (!profileResponse.ok) {
      return 'Unknown';
    }

    const profile = await profileResponse.json();
    const sector = profile?.finnhubIndustry || profile?.industry || profile?.sector;
    return typeof sector === 'string' && sector.trim() ? sector : 'Unknown';
  } catch (error) {
    console.warn(`Unable to resolve sector for ${t}:`, error);
    return 'Unknown';
  }
}

async function getFinnhubHistoricalData(ticker: string): Promise<StockDataPoint[]> {
  if (!FINNHUB_API_KEY) return [];
  const to = Math.floor(Date.now() / 1000);
  // 400 calendar days comfortably covers the 200 trading sessions required by SMA-200.
  const from = to - 400 * 24 * 60 * 60;
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const candle = await response.json();
    if (candle?.s !== 'ok' || !Array.isArray(candle.t)) return [];

    return candle.t.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      open: Number(candle.o[index]),
      high: Number(candle.h[index]),
      low: Number(candle.l[index]),
      close: Number(candle.c[index]),
      volume: Number(candle.v[index] ?? 0),
    })).filter((point: StockDataPoint) =>
      Number.isFinite(point.open) && Number.isFinite(point.high) &&
      Number.isFinite(point.low) && Number.isFinite(point.close)
    );
  } catch (error) {
    console.warn(`Unable to load historical prices for ${ticker}:`, error);
    return [];
  }
}

async function getYahooHistoricalData(ticker: string): Promise<StockDataPoint[]> {
  const period2 = Math.floor(Date.now() / 1000);
  const url = `/api/yahoo-finance/v8/finance/chart/${encodeURIComponent(ticker)}?period1=0&period2=${period2}&interval=1d&events=history`;

  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    if (!Array.isArray(result?.timestamp) || !quote) return [];

    return result.timestamp.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      open: Number(quote.open?.[index]),
      high: Number(quote.high?.[index]),
      low: Number(quote.low?.[index]),
      close: Number(quote.close?.[index]),
      volume: Number(quote.volume?.[index] ?? 0),
    })).filter((point: StockDataPoint) =>
      Number.isFinite(point.open) && Number.isFinite(point.high) &&
      Number.isFinite(point.low) && Number.isFinite(point.close)
    );
  } catch (error) {
    console.warn(`Unable to load Yahoo historical prices for ${ticker}:`, error);
    return [];
  }
}

async function getHistoricalData(ticker: string): Promise<{ data: StockDataPoint[]; source: string }> {
  const cached = historyCache.get(ticker);
  if (cached && Date.now() - cached.fetchedAt < HISTORY_CACHE_MS) {
    return { data: cached.data, source: cached.source };
  }

  const finnhubData = await getFinnhubHistoricalData(ticker);
  if (finnhubData.length >= 200) {
    historyCache.set(ticker, { data: finnhubData, source: 'Finnhub', fetchedAt: Date.now() });
    return { data: finnhubData, source: 'Finnhub' };
  }

  const yahooData = await getYahooHistoricalData(ticker);
  if (yahooData.length >= 200) {
    historyCache.set(ticker, { data: yahooData, source: 'Yahoo Finance', fetchedAt: Date.now() });
    return { data: yahooData, source: 'Yahoo Finance' };
  }

  return { data: [], source: '' };
}

export async function getStockInfo(ticker: string): Promise<StockInfo> {
  const t = ticker.toUpperCase();

  try {
    const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${t}&token=${FINNHUB_API_KEY}`;
    const quoteResponse = await fetch(quoteUrl);

    if (quoteResponse.ok) {
      const quote = await quoteResponse.json();
      const currentPrice = Number(quote.c ?? 0);
      const previousClose = Number(quote.pc ?? currentPrice);
      const volume = Number(quote.v ?? 0);
      const sector = await getTickerSector(t);

      if (Number.isFinite(currentPrice) && currentPrice > 0) {
        const history = await getHistoricalData(t);
        const historicalData = history.data;

        // Keep today's candle consistent with the live quote when the daily feed has not
        // published it yet. Indicators still require 200 genuine market sessions below.
        if (historicalData.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const last = historicalData[historicalData.length - 1];
          if (last.date === today) {
            last.close = currentPrice;
            last.high = Math.max(last.high, currentPrice);
            last.low = Math.min(last.low, currentPrice);
          }
        }

        return {
          ticker: t,
          name: t,
          sector,
          currentPrice,
          previousClose,
          volume,
          historicalData,
          lastUpdated: new Date().toISOString(),
          isLiveData: true,
          dataSource: historicalData.length >= 200
            ? `Finnhub live quote + ${history.source} daily candles`
            : 'Finnhub (live quote; history unavailable)',
          hasRealHistory: historicalData.length >= 200,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to fetch live Finnhub data, using mock data', e);
  }

  // Fallback to mock data
  const data = generateMockData(t);
  const currentPrice = data[data.length - 1].close;
  const previousClose = data[data.length - 2]?.close || currentPrice;
  const sector = await getTickerSector(t);

  return {
    ticker: t,
    name: t,
    sector,
    currentPrice,
    previousClose,
    volume: data[data.length - 1].volume,
    historicalData: data,
    lastUpdated: new Date().toISOString(),
    isLiveData: false,
    dataSource: 'Demo Data',
    hasRealHistory: false,
  };
}

export const STARTER_STOCKS = ['AAPL', 'MSFT', 'NVDA'];

export function getAllAvailableTickers(): string[] {
  return ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'JPM'];
}
