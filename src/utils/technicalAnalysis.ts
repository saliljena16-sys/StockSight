import { StockDataPoint } from './mockData';

export type Recommendation = 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';

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

export function analyzeStock(stockData: StockDataPoint[]): AnalysisResult {
  const closePrices = stockData.map(d => d.close);
  const sma50 = calculateSMA(closePrices, 50);
  const sma200 = calculateSMA(closePrices, 200);
  const rsi = calculateRSI(closePrices, 14);

  const currentRSI = rsi.filter(v => !isNaN(v)).pop() || 50;
  const sma50Current = sma50.filter(v => !isNaN(v)).pop() || 0;
  const sma200Current = sma200.filter(v => !isNaN(v)).pop() || 0;
  const currentPrice = closePrices[closePrices.length - 1];

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
    signals
  };
}

export function calculateCAGR(data: StockDataPoint[]): number {
  if (data.length < 252) return 0.10;
  const startPrice = data[0].close;
  const endPrice = data[data.length - 1].close;
  const years = data.length / 252;
  return Math.max(-0.2, Math.min(0.5, Math.pow(endPrice / startPrice, 1 / years) - 1));
}
