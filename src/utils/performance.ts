import type { StockDataPoint } from './mockData';

export interface PerformanceMetrics {
  returnPercent: number;
  annualizedVolatility: number;
  maxDrawdown: number;
  normalized: Array<{ date: string; value: number }>;
}

export function calculatePerformance(data: StockDataPoint[]): PerformanceMetrics {
  const valid = data.filter(point => Number.isFinite(point.close) && point.close > 0);
  if (valid.length < 2) return { returnPercent: 0, annualizedVolatility: 0, maxDrawdown: 0, normalized: [] };
  const first = valid[0].close;
  const returns = valid.slice(1).map((point, index) => point.close / valid[index].close - 1);
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(returns.length - 1, 1);
  let peak = first;
  let maxDrawdown = 0;
  valid.forEach(point => {
    peak = Math.max(peak, point.close);
    maxDrawdown = Math.min(maxDrawdown, point.close / peak - 1);
  });
  return {
    returnPercent: (valid[valid.length - 1].close / first - 1) * 100,
    annualizedVolatility: Math.sqrt(variance) * Math.sqrt(252) * 100,
    maxDrawdown: maxDrawdown * 100,
    normalized: valid.map(point => ({ date: point.date, value: (point.close / first) * 100 })),
  };
}
