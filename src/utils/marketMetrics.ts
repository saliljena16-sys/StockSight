import type { StockInfo } from './mockData';

type PriceFields = Pick<StockInfo, 'currentPrice' | 'previousClose'>;
type HistoryFields = Pick<StockInfo, 'currentPrice' | 'historicalData'>;

/** Today's move against the previous close, in percent; 0 without a previous close. */
export const dayChangePercent = (stock: PriceFields) => stock.previousClose > 0
  ? ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100
  : 0;

/**
 * Return from the close `sessions` sessions ago to the live price, in percent.
 * Used by the Screeners view (1M momentum).
 */
export const returnToCurrentPrice = (stock: HistoryFields, sessions: number) => {
  const points = stock.historicalData;
  if (points.length < 2) return 0;
  const start = points[Math.max(0, points.length - 1 - sessions)]?.close;
  return start ? ((stock.currentPrice - start) / start) * 100 : 0;
};

/**
 * Return from the close `sessions` sessions ago to the latest daily close, in percent.
 * Used by the watchlist Performance table (1W, 1M, 3M, 1Y). Note this ends at the last close,
 * not the live price, unlike `returnToCurrentPrice`.
 */
export const closeToCloseReturn = (stock: Pick<StockInfo, 'historicalData'>, sessions: number) => {
  const points = stock.historicalData;
  if (points.length < 2) return 0;
  const end = points[points.length - 1].close;
  const start = points[Math.max(0, points.length - 1 - sessions)].close;
  return start > 0 ? ((end - start) / start) * 100 : 0;
};

/**
 * Year-to-date return to the live price, from the first candle dated in the current year
 * (or the first candle overall when none is), in percent.
 */
export const yearToDateReturn = (stock: HistoryFields, now: Date = new Date()) => {
  const firstYtdIndex = stock.historicalData.findIndex(point => new Date(point.date).getFullYear() === now.getFullYear());
  const firstYtd = firstYtdIndex >= 0 ? stock.historicalData[firstYtdIndex].close : stock.historicalData[0]?.close;
  return firstYtd ? ((stock.currentPrice - firstYtd) / firstYtd) * 100 : 0;
};

/** Annualised volatility of the last 30 daily returns, in percent; 0 with fewer than 3 closes. */
export const annualizedVolatility30d = (stock: Pick<StockInfo, 'historicalData'>) => {
  const closes = stock.historicalData.slice(-31).map(point => point.close);
  if (closes.length < 3) return 0;
  const returns = closes.slice(1).map((close, index) => (close - closes[index]) / closes[index]);
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
};
