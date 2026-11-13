import type { StockInfo } from './mockData';
// Explicit extension so the Node test runner can load this module directly.
import { calculateCAGR, type HistoricalCAGR } from './technicalAnalysis.ts';

export interface ForecastInputs {
  cagr: HistoricalCAGR | null;
  /** Why there is no forecast; undefined when there is one (or no stock is selected). */
  unavailableReason?: string;
}

/**
 * The growth rate the forecaster may use for `stock`. Only real, live history is forecast from;
 * demo series and short histories get an explanation instead of an assumed rate.
 */
export function getForecastInputs(stock: StockInfo | undefined): ForecastInputs {
  const cagr = stock?.isLiveData && stock.hasRealHistory
    ? calculateCAGR(stock.historicalData)
    : null;
  const unavailableReason = !stock || cagr
    ? undefined
    : !stock.isLiveData
      ? 'Showing demo data: the price series is simulated.'
      : !stock.hasRealHistory
        ? stock.historyUnavailableReason ?? 'Daily price history is unavailable.'
        : `Only ${stock.historicalData.length} trading sessions of history are available.`;
  return { cagr, unavailableReason };
}
