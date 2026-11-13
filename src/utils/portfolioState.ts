// Pure transforms for the per-portfolio state maps. Each function mirrors one state updater, so
// the hook can keep the maps as separate useState slices with identical semantics.
import type { PortfolioState } from './portfolioDb';
// Explicit extension so the Node test runner can load this module directly.
import { portfolioNameError } from './portfolioNames.ts';
import type {
  PortfolioAverageCosts,
  PortfolioCash,
  PortfolioQuantities,
  PortfolioTickers,
  PortfolioTransactions,
  Transaction,
} from '../types/portfolio';

// --- tickers in a portfolio ---

/** Lists `ticker` in `portfolio`; returns `prev` unchanged when it is already listed. */
export function addTicker(prev: PortfolioTickers, portfolio: string, ticker: string): PortfolioTickers {
  const current = prev[portfolio] ?? [];
  if (current.includes(ticker)) return prev;
  return { ...prev, [portfolio]: [...current, ticker] };
}

/** Unlists `ticker` from `portfolio`. */
export function removeTicker(prev: PortfolioTickers, portfolio: string, ticker: string): PortfolioTickers {
  const current = prev[portfolio] ?? [];
  return { ...prev, [portfolio]: current.filter(item => item !== ticker) };
}

/** List membership after a share count is set: a positive count lists the ticker, zero unlists it. */
export function setTickerListed(prev: PortfolioTickers, portfolio: string, ticker: string, quantity: number): PortfolioTickers {
  const current = prev[portfolio] ?? [];
  const exists = current.includes(ticker);
  if (quantity > 0 && !exists) return { ...prev, [portfolio]: [...current, ticker] };
  if (quantity === 0 && exists) return { ...prev, [portfolio]: current.filter(item => item !== ticker) };
  return prev;
}

// --- share counts, average costs, cash ---

/** Clamps a user-entered share count to a non-negative number (non-numbers become 0). */
export const sanitizeQuantity = (value: number) => Math.max(0, Number(value) || 0);

/** Adds one share of `ticker` (starting from zero when it isn't held). */
export function incrementQuantity(prev: PortfolioQuantities, portfolio: string, ticker: string): PortfolioQuantities {
  return {
    ...prev,
    [portfolio]: {
      ...(prev[portfolio] ?? {}),
      [ticker]: (prev[portfolio]?.[ticker] ?? 0) + 1,
    },
  };
}

/** Sets a share count; zero or less removes the entry. */
export function setQuantity(prev: PortfolioQuantities, portfolio: string, ticker: string, quantity: number): PortfolioQuantities {
  const next = { ...(prev[portfolio] ?? {}) };
  if (quantity <= 0) {
    delete next[ticker];
    return { ...prev, [portfolio]: next };
  }
  return { ...prev, [portfolio]: { ...next, [ticker]: quantity } };
}

/** Removes `ticker` from one portfolio's per-ticker map (share counts or average costs). */
export function omitTicker<T>(prev: Record<string, Record<string, T>>, portfolio: string, ticker: string): Record<string, Record<string, T>> {
  const current = prev[portfolio] ?? {};
  const { [ticker]: _removed, ...rest } = current;
  return { ...prev, [portfolio]: rest };
}

export function setAverageCost(prev: PortfolioAverageCosts, portfolio: string, ticker: string, averageCost: number): PortfolioAverageCosts {
  return { ...prev, [portfolio]: { ...(prev[portfolio] ?? {}), [ticker]: averageCost } };
}

/** Sets a cash balance from user input, clamped to a non-negative number. */
export function setCash(prev: PortfolioCash, portfolio: string, value: string | number): PortfolioCash {
  return { ...prev, [portfolio]: Math.max(0, Number(value) || 0) };
}

/**
 * Every listed ticker gets at least one share and unlisted tickers lose theirs; maps for deleted
 * portfolios are dropped. Always returns a new object.
 */
export function syncQuantitiesWithPortfolios(prev: PortfolioQuantities, portfolios: PortfolioTickers): PortfolioQuantities {
  const next = { ...prev };
  Object.keys(portfolios).forEach((portfolioName) => {
    const current = portfolios[portfolioName] ?? [];
    next[portfolioName] = { ...(next[portfolioName] ?? {}) };

    current.forEach((ticker) => {
      if (!next[portfolioName][ticker]) {
        next[portfolioName][ticker] = 1;
      }
    });

    Object.keys(next[portfolioName]).forEach((ticker) => {
      if (!current.includes(ticker)) {
        delete next[portfolioName][ticker];
      }
    });
  });

  Object.keys(next).forEach((portfolioName) => {
    if (!portfolios[portfolioName]) {
      delete next[portfolioName];
    }
  });

  return next;
}

// --- transactions ---

/**
 * The transaction recorded when a holding's share count changes from `previousQuantity` to
 * `quantity`, or null when it didn't change. The recorded price is the price passed in.
 */
export function createHoldingTransaction(
  ticker: string,
  previousQuantity: number,
  quantity: number,
  price: number,
  now: Date = new Date(),
): Transaction | null {
  const delta = quantity - previousQuantity;
  if (!(Math.abs(delta) > 0.000001)) return null;
  return {
    id: `${now.getTime()}-${ticker}`,
    ticker,
    type: delta > 0 ? 'buy' : 'sell',
    quantity: Math.abs(delta),
    price,
    date: now.toISOString(),
  };
}

/** Adds a transaction to the front (newest first) of a portfolio's list. */
export function prependTransaction(prev: PortfolioTransactions, portfolio: string, transaction: Transaction): PortfolioTransactions {
  return { ...prev, [portfolio]: [transaction, ...(prev[portfolio] ?? [])] };
}

// --- whole portfolios ---

/** Every per-portfolio map, keyed by portfolio name. */
export interface PortfolioMaps {
  portfolios: PortfolioTickers;
  quantities: PortfolioQuantities;
  averageCosts: PortfolioAverageCosts;
  cash: PortfolioCash;
  transactions: PortfolioTransactions;
}

/** Moves `from`'s entry to `to` (appended last). Only call when `to` is not already a key. */
function renameKey<T>(prev: Record<string, T>, from: string, to: string, fallback: T): Record<string, T> {
  const next = { ...prev };
  const value = next[from] ?? fallback;
  delete next[from];
  next[to] = value;
  return next;
}

/**
 * Adds an empty portfolio named `name` to every map. Returns null, changing nothing, when the
 * name clashes with an existing portfolio, so another portfolio's data is never reset.
 */
export function createPortfolioIn(maps: PortfolioMaps, name: string): PortfolioMaps | null {
  if (portfolioNameError(name, Object.keys(maps.portfolios))) return null;
  return {
    portfolios: { ...maps.portfolios, [name]: [] },
    quantities: { ...maps.quantities, [name]: {} },
    averageCosts: { ...maps.averageCosts, [name]: {} },
    cash: { ...maps.cash, [name]: 0 },
    transactions: { ...maps.transactions, [name]: [] },
  };
}

/**
 * Renames `from` to `to` in every map. Returns null, changing nothing, when `from` doesn't exist,
 * the name is unchanged, or `to` clashes with another portfolio, so no data is ever overwritten.
 */
export function renamePortfolioIn(maps: PortfolioMaps, from: string, to: string): PortfolioMaps | null {
  if (from === to || !(from in maps.portfolios)) return null;
  if (portfolioNameError(to, Object.keys(maps.portfolios), from)) return null;
  return {
    portfolios: renameKey<string[]>(maps.portfolios, from, to, []),
    quantities: renameKey(maps.quantities, from, to, {}),
    averageCosts: renameKey(maps.averageCosts, from, to, {}),
    cash: renameKey(maps.cash, from, to, 0),
    transactions: renameKey<Transaction[]>(maps.transactions, from, to, []),
  };
}

/** Removes one key from a per-portfolio map. */
export function omitKey<T>(prev: Record<string, T>, key: string): Record<string, T> {
  const next = { ...prev };
  delete next[key];
  return next;
}

// --- persistence mapping ---

/** Splits saved holdings into the share-count and average-cost maps. */
export function splitHoldings(holdings: PortfolioState['holdings']): { quantities: PortfolioQuantities; averageCosts: PortfolioAverageCosts } {
  return {
    quantities: Object.fromEntries(Object.entries(holdings).map(([name, items]) => [name, Object.fromEntries(Object.entries(items).map(([ticker, holding]) => [ticker, holding.quantity]))])),
    averageCosts: Object.fromEntries(Object.entries(holdings).map(([name, items]) => [name, Object.fromEntries(Object.entries(items).map(([ticker, holding]) => [ticker, holding.averageCost]))])),
  };
}

/** Builds the persisted shape. Holdings cover only listed portfolios; missing average costs save as 0. */
export function toPortfolioState(maps: {
  portfolios: PortfolioTickers;
  quantities: PortfolioQuantities;
  averageCosts: PortfolioAverageCosts;
  cash: PortfolioCash;
  transactions: PortfolioTransactions;
}): PortfolioState {
  const { portfolios, quantities, averageCosts, cash, transactions } = maps;
  const holdings = Object.fromEntries(Object.keys(portfolios).map(name => [name, Object.fromEntries(Object.entries(quantities[name] ?? {}).map(([ticker, quantity]) => [ticker, { quantity, averageCost: averageCosts[name]?.[ticker] ?? 0 }]))]));
  return { portfolios, holdings, cash, transactions };
}
