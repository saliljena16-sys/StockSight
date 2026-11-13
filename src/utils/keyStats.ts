import type { StockInfo } from './mockData';

/** Trading sessions in roughly three calendar months. */
export const SESSIONS_3M = 63;

/**
 * Market statistics derived only from real inputs. A value is `null` whenever it cannot be
 * computed from live data; callers render that as "—" rather than substituting an estimate.
 */
export interface KeyStats {
  lastPrice: number | null;
  /** Last price × Finnhub shares outstanding. */
  marketCap: number | null;
  /** Volume of the most recent daily candle. */
  lastVolume: number | null;
  lastVolumeDate: string | null;
  /** Mean daily volume over the last 63 sessions. */
  avgVolume3M: number | null;
  week52Low: number | null;
  week52High: number | null;
}

type KeyStatsInput = Pick<StockInfo, 'currentPrice' | 'isLiveData' | 'hasRealHistory' | 'historicalData' | 'sharesOutstanding'>;

const EMPTY_STATS: KeyStats = {
  lastPrice: null,
  marketCap: null,
  lastVolume: null,
  lastVolumeDate: null,
  avgVolume3M: null,
  week52Low: null,
  week52High: null,
};

const positiveOrNull = (value: number | undefined) =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : null;

function oneYearBefore(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

export function calculateKeyStats(stock: KeyStatsInput): KeyStats {
  // Demo series are generated, so nothing derived from them is reported here.
  if (!stock.isLiveData) return { ...EMPTY_STATS };

  const lastPrice = positiveOrNull(stock.currentPrice);
  const shares = positiveOrNull(stock.sharesOutstanding);
  const stats: KeyStats = {
    ...EMPTY_STATS,
    lastPrice,
    marketCap: lastPrice !== null && shares !== null ? lastPrice * shares : null,
  };

  const points = stock.historicalData;
  if (!stock.hasRealHistory || points.length === 0) return stats;

  const latest = points[points.length - 1];
  stats.lastVolume = positiveOrNull(latest.volume);
  stats.lastVolumeDate = stats.lastVolume !== null ? latest.date : null;

  const volumes = points.slice(-SESSIONS_3M).map(point => point.volume).filter(volume => Number.isFinite(volume) && volume > 0);
  stats.avgVolume3M = volumes.length > 0 ? volumes.reduce((sum, volume) => sum + volume, 0) / volumes.length : null;

  const cutoff = oneYearBefore(latest.date);
  const trailingYear = points.filter(point => point.date > cutoff);
  if (trailingYear.length > 0) {
    stats.week52Low = Math.min(...trailingYear.map(point => point.low));
    stats.week52High = Math.max(...trailingYear.map(point => point.high));
  }

  return stats;
}
