// Technical Analysis Engine for StockSight
// Implements SMA crossover strategy and RSI indicator

import { StockDataPoint } from './mockData';

export type Recommendation = 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';

export interface AnalysisResult {
  recommendation: Recommendation;
  confidence: number; // 0-100
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

// Calculate Simple Moving Average
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

// Calculate Relative Strength Index (RSI)
function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // First RSI value
  if (gains.length < period) {
    return [NaN];
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  rsi.push(NaN); // padding for first element
  for (let i = 0; i < period; i++) {
    rsi.push(NaN);
  }

  // Calculate RSI for remaining points
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
    }
  }

  return rsi;
}

export function analyzeStock(stockData: StockDataPoint[]): AnalysisResult {
  const closePrices = stockData.map(d => d.close);
  
  // Calculate indicators
  const sma50 = calculateSMA(closePrices, 50);
  const sma200 = calculateSMA(closePrices, 200);
  const rsi = calculateRSI(closePrices, 14);

  const currentRSI = rsi.filter(v => !isNaN(v)).pop() || 50;
  const sma50Current = sma50.filter(v => !isNaN(v)).pop() || 0;
  const sma200Current = sma200.filter(v => !isNaN(v)).pop() || 0;
  const currentPrice = closePrices[closePrices.length - 1];

  const signals: Signal[] = [];
  let score = 0; // -100 to 100

  // SMA 50/200 Crossover (Golden/Death Cross)
  if (sma50Current > sma200Current) {
    signals.push({
      type: 'bullish',
      name: 'Golden Cross',
      description: '50-day SMA is above 200-day SMA, indicating bullish long-term momentum',
    });
    score += 30;
  } else {
    signals.push({
      type: 'bearish',
      name: 'Death Cross',
      description: '50-day SMA is below 200-day SMA, indicating bearish long-term momentum',
    });
    score -= 30;
  }

  // Price vs SMA 50
  if (currentPrice > sma50Current) {
    signals.push({
      type: 'bullish',
      name: 'Above 50-SMA',
      description: `Price ($${currentPrice.toFixed(2)}) is trading above the 50-day SMA ($${sma50Current.toFixed(2)})`,
    });
    score += 15;
  } else {
    signals.push({
      type: 'bearish',
      name: 'Below 50-SMA',
      description: `Price ($${currentPrice.toFixed(2)}) is trading below the 50-day SMA ($${sma50Current.toFixed(2)})`,
    });
    score -= 15;
  }

  // Price vs SMA 200
  if (currentPrice > sma200Current) {
    signals.push({
      type: 'bullish',
      name: 'Above 200-SMA',
      description: `Price is above the 200-day SMA ($${sma200Current.toFixed(2)}), confirming long-term uptrend`,
    });
    score += 15;
  } else {
    signals.push({
      type: 'bearish',
      name: 'Below 200-SMA',
      description: `Price is below the 200-day SMA ($${sma200Current.toFixed(2)}), confirming long-term downtrend`,
    });
    score -= 15;
  }

  // RSI Analysis
  if (currentRSI < 30) {
    signals.push({
      type: 'bullish',
      name: 'RSI Oversold',
      description: `RSI at ${currentRSI.toFixed(1)} indicates the stock is oversold — potential buying opportunity`,
    });
    score += 25;
  } else if (currentRSI > 70) {
    signals.push({
      type: 'bearish',
      name: 'RSI Overbought',
      description: `RSI at ${currentRSI.toFixed(1)} indicates the stock is overbought — potential selling opportunity`,
    });
    score -= 25;
  } else if (currentRSI >= 40 && currentRSI <= 60) {
    signals.push({
      type: 'neutral',
      name: 'RSI Neutral',
      description: `RSI at ${currentRSI.toFixed(1)} is in neutral territory`,
    });
  } else if (currentRSI > 50) {
    signals.push({
      type: 'bullish',
      name: 'RSI Bullish',
      description: `RSI at ${currentRSI.toFixed(1)} shows moderate bullish momentum`,
    });
    score += 10;
  } else {
    signals.push({
      type: 'bearish',
      name: 'RSI Bearish',
      description: `RSI at ${currentRSI.toFixed(1)} shows moderate bearish momentum`,
    });
    score -= 10;
  }

  // Recent momentum (last 10 days)
  const recentPrices = closePrices.slice(-10);
  const recentChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0] * 100;
  if (recentChange > 3) {
    signals.push({
      type: 'bullish',
      name: 'Strong Short-term Momentum',
      description: `Stock gained ${recentChange.toFixed(1)}% in the last 10 trading days`,
    });
    score += 15;
  } else if (recentChange < -3) {
    signals.push({
      type: 'bearish',
      name: 'Weak Short-term Momentum',
      description: `Stock lost ${Math.abs(recentChange).toFixed(1)}% in the last 10 trading days`,
    });
    score -= 15;
  }

  // Determine recommendation
  let recommendation: Recommendation;
  if (score >= 40) recommendation = 'STRONG BUY';
  else if (score >= 15) recommendation = 'BUY';
  else if (score >= -15) recommendation = 'HOLD';
  else if (score >= -40) recommendation = 'SELL';
  else recommendation = 'STRONG SELL';

  const confidence = Math.min(95, Math.max(20, Math.abs(score) + 20));

  return {
    recommendation,
    confidence,
    sma50,
    sma200,
    rsi,
    currentRSI,
    sma50Current,
    sma200Current,
    signals,
  };
}

// Calculate historical CAGR for projections
export function calculateCAGR(data: StockDataPoint[]): number {
  if (data.length < 252) return 0.10; // Default 10% if not enough data

  const startPrice = data[0].close;
  const endPrice = data[data.length - 1].close;
  const years = data.length / 252;
  
  const cagr = Math.pow(endPrice / startPrice, 1 / years) - 1;
  return Math.max(-0.2, Math.min(0.5, cagr)); // Clamp between -20% and 50%
}
