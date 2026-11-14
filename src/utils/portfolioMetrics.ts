import type { StockInfo } from './mockData';

/** A holding's move today, used for best/worst performer. */
export interface Performer {
  stock: StockInfo;
  change: number;
  percent: number;
}

export interface PortfolioSummary {
  /** Market value of positions with a positive share count. */
  portfolioValue: number;
  cashBalance: number;
  /** Positions plus cash. */
  totalPortfolioValue: number;
  /** Shares × average cost (falling back to the live price), across every listed stock. */
  costBasis: number;
  totalGain: number;
  totalGainPercent: number;
  /** Stocks with a positive share count. */
  holdingStocks: StockInfo[];
  dayChange: number;
  dayChangePercent: number;
  bestPerformer: Performer | null;
  worstPerformer: Performer | null;
  /** e.g. "50% Technology", or "No holdings". */
  sectorSummary: string;
}

/**
 * Portfolio-level figures for one portfolio. `quantities`, `averageCosts` and `cash` are that
 * portfolio's entries (possibly undefined) from the per-portfolio maps.
 */
export function calculatePortfolioSummary(
  stocks: StockInfo[],
  quantities: Record<string, number> | undefined,
  averageCosts: Record<string, number> | undefined,
  cash: number | undefined,
): PortfolioSummary {
  const portfolioValue = stocks.reduce((total, stock) => {
    const quantity = quantities?.[stock.ticker] ?? 0;
    return total + (quantity > 0 ? stock.currentPrice * quantity : 0);
  }, 0);
  const cashBalance = cash ?? 0;
  const totalPortfolioValue = portfolioValue + cashBalance;
  const costBasis = stocks.reduce((total, stock) => {
    const quantity = quantities?.[stock.ticker] ?? 0;
    const averageCost = averageCosts?.[stock.ticker] ?? stock.currentPrice;
    return total + quantity * averageCost;
  }, 0);
  const totalGain = portfolioValue - costBasis;
  const totalGainPercent = costBasis > 0 ? (totalGain / costBasis) * 100 : 0;

  const holdingStocks = stocks.filter(stock => (quantities?.[stock.ticker] ?? 0) > 0);
  const dayChange = holdingStocks.reduce((total, stock) => {
    const quantity = quantities?.[stock.ticker] ?? 0;
    return total + (stock.currentPrice - stock.previousClose) * quantity;
  }, 0);
  const previousValue = holdingStocks.reduce((total, stock) => {
    const quantity = quantities?.[stock.ticker] ?? 0;
    return total + stock.previousClose * quantity;
  }, 0);
  const dayChangePercent = previousValue > 0 ? (dayChange / previousValue) * 100 : 0;

  const performers = holdingStocks.map(stock => {
    const change = stock.currentPrice - stock.previousClose;
    const percent = stock.previousClose > 0 ? (change / stock.previousClose) * 100 : 0;
    return { stock, change, percent };
  });
  const bestPerformer = performers.length > 0
    ? performers.reduce((best, item) => item.percent > best.percent ? item : best)
    : null;
  const worstPerformer = performers.length > 0
    ? performers.reduce((worst, item) => item.percent < worst.percent ? item : worst)
    : null;

  const sectorCounts = holdingStocks.reduce<Record<string, number>>((counts, stock) => {
    const sector = stock.sector || 'Unknown';
    counts[sector] = (counts[sector] ?? 0) + 1;
    return counts;
  }, {});
  const dominantSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0];
  const sectorSummary = dominantSector && holdingStocks.length > 0
    ? `${Math.round((dominantSector[1] / holdingStocks.length) * 100)}% ${dominantSector[0]}`
    : 'No holdings';

  return {
    portfolioValue,
    cashBalance,
    totalPortfolioValue,
    costBasis,
    totalGain,
    totalGainPercent,
    holdingStocks,
    dayChange,
    dayChangePercent,
    bestPerformer,
    worstPerformer,
    sectorSummary,
  };
}

/** Market value per sector, as [sector, value] pairs in first-seen order. */
export function calculateSectorAllocation(holdingStocks: StockInfo[], quantities: Record<string, number> | undefined) {
  return Object.entries(holdingStocks.reduce<Record<string, number>>((values, stock) => ({
    ...values,
    [stock.sector || 'Unknown']: (values[stock.sector || 'Unknown'] ?? 0) + stock.currentPrice * (quantities?.[stock.ticker] ?? 0),
  }), {}));
}

/** Row figures for the Holdings table. Dividend income and realised gains are not tracked yet (always 0). */
export function getHoldingMetrics(stock: StockInfo, quantity: number, averageCost: number | undefined) {
  const hasHolding = quantity > 0;
  const previousClose = stock.previousClose || stock.currentPrice;
  const dayChange = stock.currentPrice - previousClose;
  const dayChangePct = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;
  const avgCostPerShare = hasHolding ? (averageCost ?? stock.currentPrice) : 0;
  const totalCost = hasHolding ? avgCostPerShare * quantity : 0;
  const marketValue = stock.currentPrice * quantity;
  const totalDivIncome = 0;
  const dayGainDollar = dayChange * quantity;
  const dayGainPct = previousClose > 0 ? dayChangePct : 0;
  const totalGainDollar = marketValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGainDollar / totalCost) * 100 : 0;
  const realizedGainDollar = 0;
  const realizedGainPct = 0;

  return {
    hasHolding,
    status: hasHolding ? 'Open' : '-',
    shares: quantity,
    avgCostPerShare,
    totalCost,
    marketValue,
    totalDivIncome,
    dayGainPct,
    dayGainDollar,
    totalGainPct,
    totalGainDollar,
    realizedGainPct,
    realizedGainDollar,
  };
}

/**
 * Figures for one row of the Summary holdings table. Total P/L is (live price − average cost) ×
 * shares, the same figure as the Holdings tab; without an average cost it falls back to the live
 * price (P/L 0), as everywhere else.
 */
export function calculateSummaryRow(stock: StockInfo, quantity: number, averageCost: number | undefined) {
  const marketValue = stock.currentPrice * quantity;
  const dayChange = stock.currentPrice - stock.previousClose;
  const dayPnL = dayChange * quantity;
  const dayPnLPercent = stock.previousClose > 0 ? (dayChange / stock.previousClose) * 100 : 0;
  const totalPnL = getHoldingMetrics(stock, quantity, averageCost).totalGainDollar;
  return { marketValue, dayPnL, dayPnLPercent, totalPnL };
}
