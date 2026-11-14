import type { StockDataPoint } from './mockData';

/** A candle together with its position in the full history (indicator arrays are indexed by it). */
export interface IndexedPoint {
  point: StockDataPoint;
  index: number;
}

/** Candlestick series data for the visible candles. */
export function toCandleData(points: IndexedPoint[]) {
  return points.map(({ point }) => ({
    time: point.date,
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
  }));
}

/** Line series data for an indicator (e.g. SMA-50), skipping sessions where it isn't defined yet. */
export function toLineData(points: IndexedPoint[], values: number[]) {
  return points
    .map(({ point, index }) => ({ time: point.date, value: values[index] }))
    .filter(d => !isNaN(d.value));
}

/**
 * Cheap fingerprint of a price history: its length, first and last dates, and the last candle's
 * values. The quote refresh updates today's candle in place (same array), so identity alone would
 * miss that change; this changes whenever the chart's data meaningfully does.
 */
export function historySignature(points: StockDataPoint[]): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return '0';
  return [points.length, first.date, last.date, last.open, last.high, last.low, last.close, last.volume].join('|');
}
