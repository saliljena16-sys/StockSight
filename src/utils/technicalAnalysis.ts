import type { StockDataPoint } from './mockData';

export type Recommendation = 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL' | 'UNAVAILABLE';

export interface AnalysisResult {
  recommendation: Recommendation;
  confidence: number;
  sma50: number[];
  sma200: number[];
  rsi: number[];
  currentRSI: number;
  sma50Current: number;
  sma200Current: number;
  signals: Signal[];
  isValid: boolean;
}

export interface Signal {
  type: 'bullish' | 'bearish' | 'neutral';
  name: string;
  description: string;
}

function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(Math.round((sum / period) * 100) / 100);
    }
  }
  return sma;
}

function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  if (gains.length < period) return [NaN];

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  rsi.push(NaN);
  for (let i = 0; i < period; i++) rsi.push(NaN);

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    if (avgLoss === 0) rsi.push(100);
    else rsi.push(Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 100) / 100);
  }

  return rsi;
}

export function analyzeStock(stockData: StockDataPoint[], hasRealHistory = true): AnalysisResult {
  const closePrices = stockData.map(d => d.close);
  const sma50 = calculateSMA(closePrices, 50);
  const sma200 = calculateSMA(closePrices, 200);
  const rsi = calculateRSI(closePrices, 14);

  const currentRSI = rsi.filter(v => !isNaN(v)).pop() ?? NaN;
  const sma50Current = sma50.filter(v => !isNaN(v)).pop() ?? NaN;
  const sma200Current = sma200.filter(v => !isNaN(v)).pop() ?? NaN;
  const currentPrice = closePrices[closePrices.length - 1];

  if (!hasRealHistory || stockData.length < 200 || !Number.isFinite(currentPrice) ||
      !Number.isFinite(sma50Current) || !Number.isFinite(sma200Current) ||
      !Number.isFinite(currentRSI)) {
    return {
      recommendation: 'UNAVAILABLE',
      confidence: 0,
      sma50,
      sma200,
      rsi,
      currentRSI,
      sma50Current,
      sma200Current,
      signals: [{
        type: 'neutral',
        name: 'Insufficient real market history',
        description: hasRealHistory
          ? `At least 200 daily market sessions are required; ${stockData.length} are available.`
          : 'A recommendation is not calculated from simulated prices.',
      }],
      isValid: false,
    };
  }

  const signals: Signal[] = [];
  let score = 0;

  if (sma50Current > sma200Current) {
    signals.push({ type: 'bullish', name: 'Golden Cross', description: '50-day SMA is above 200-day SMA' });
    score += 30;
  } else {
    signals.push({ type: 'bearish', name: 'Death Cross', description: '50-day SMA is below 200-day SMA' });
    score -= 30;
  }

  if (currentPrice > sma50Current) {
    signals.push({ type: 'bullish', name: 'Above 50-SMA', description: 'Price is above 50-day SMA' });
    score += 15;
  } else {
    signals.push({ type: 'bearish', name: 'Below 50-SMA', description: 'Price is below 50-day SMA' });
    score -= 15;
  }

  if (currentPrice > sma200Current) {
    signals.push({ type: 'bullish', name: 'Above 200-SMA', description: 'Price is above 200-day SMA' });
    score += 15;
  } else {
    signals.push({ type: 'bearish', name: 'Below 200-SMA', description: 'Price is below 200-day SMA' });
    score -= 15;
  }

  if (currentRSI < 30) {
    signals.push({ type: 'bullish', name: 'RSI Oversold', description: 'RSI at ' + currentRSI.toFixed(1) + ' indicates oversold' });
    score += 25;
  } else if (currentRSI > 70) {
    signals.push({ type: 'bearish', name: 'RSI Overbought', description: 'RSI at ' + currentRSI.toFixed(1) + ' indicates overbought' });
    score -= 25;
  } else if (currentRSI > 50) {
    signals.push({ type: 'bullish', name: 'RSI Bullish', description: 'RSI at ' + currentRSI.toFixed(1) + ' shows bullish momentum' });
    score += 10;
  } else {
    signals.push({ type: 'bearish', name: 'RSI Bearish', description: 'RSI at ' + currentRSI.toFixed(1) + ' shows bearish momentum' });
    score -= 10;
  }

  const recentPrices = closePrices.slice(-10);
  const recentChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0] * 100;
  if (recentChange > 3) {
    signals.push({ type: 'bullish', name: 'Strong Momentum', description: 'Stock gained ' + recentChange.toFixed(1) + '% in last 10 days' });
    score += 15;
  } else if (recentChange < -3) {
    signals.push({ type: 'bearish', name: 'Weak Momentum', description: 'Stock lost ' + Math.abs(recentChange).toFixed(1) + '% in last 10 days' });
    score -= 15;
  }

  let recommendation: Recommendation;
  if (score >= 40) recommendation = 'STRONG BUY';
  else if (score >= 15) recommendation = 'BUY';
  else if (score >= -15) recommendation = 'HOLD';
  else if (score >= -40) recommendation = 'SELL';
  else recommendation = 'STRONG SELL';

  return {
    recommendation,
    confidence: Math.min(95, Math.max(20, Math.abs(score) + 20)),
    sma50,
    sma200,
    rsi,
    currentRSI,
    sma50Current,
    sma200Current,
    signals,
    isValid: true,
  };
}

/** Roughly one year of trading sessions; less than this is not enough to state an annual rate. */
export const MIN_CAGR_SESSIONS = 252;

export interface HistoricalCAGR {
  /** Compound annual growth rate of the closing price, e.g. 0.12 for 12%. */
  rate: number;
  startDate: string;
  endDate: string;
  years: number;
}

/**
 * Price-only compound annual growth over the full series, measured between the first and last
 * close and annualised by calendar time. Returns null when there is less than a year of data or
 * the prices are unusable — callers must show that state rather than substitute a default rate.
 */
export function calculateCAGR(data: StockDataPoint[]): HistoricalCAGR | null {
  if (data.length < MIN_CAGR_SESSIONS) return null;
  const first = data[0];
  const last = data[data.length - 1];
  if (!(first.close > 0) || !(last.close > 0)) return null;

  const years = (Date.parse(`${last.date}T00:00:00Z`) - Date.parse(`${first.date}T00:00:00Z`)) / (365.25 * 86_400_000);
  if (!Number.isFinite(years) || years < 0.9) return null;

  const rate = Math.pow(last.close / first.close, 1 / years) - 1;
  if (!Number.isFinite(rate)) return null;
  return { rate, startDate: first.date, endDate: last.date, years };
}
