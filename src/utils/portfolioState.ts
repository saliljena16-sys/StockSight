// Pure transforms for the per-portfolio state maps. Each function mirrors one state updater, so
// the hook can keep the maps as separate useState slices with identical semantics.
import type { HoldingMap, PortfolioMap, PortfolioState } from './portfolioDb';
// Explicit extension so the Node test runner can load this module directly.
import { portfolioNameError } from './portfolioNames.ts';
import { formatCurrency, formatShares } from './format.ts';
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

/**
 * Lists `ticker` when it now has shares and isn't listed yet. Never unlists: a stock whose shares
 * drop to zero stays on the watchlist.
 */
export function listTickerIfHeld(prev: PortfolioTickers, portfolio: string, ticker: string, quantity: number): PortfolioTickers {
  const current = prev[portfolio] ?? [];
  if (quantity > 0 && !current.includes(ticker)) return { ...prev, [portfolio]: [...current, ticker] };
  return prev;
}

// --- share counts, average costs, cash ---

/** Clamps a user-entered share count to a non-negative number (non-numbers become 0). */
export const sanitizeQuantity = (value: number) => Math.max(0, Number(value) || 0);

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

/**
 * What removing a stock from a portfolio would also delete, for the confirmation under "Remove
 * AAPL?": its shares and average cost. Null when it holds no shares, so a stock that is only
 * watched is removed without asking.
 */
export function removeStockWarning(quantity: number | undefined, averageCost: number | undefined): string | null {
  if (!quantity || quantity <= 0) return null;
  const shares = `${formatShares(quantity)} ${quantity === 1 ? 'share' : 'shares'}`;
  const cost = averageCost === undefined ? '' : ` and average cost (${formatCurrency(averageCost)})`;
  return `This also deletes your ${shares}${cost}.`;
}

export function setAverageCost(prev: PortfolioAverageCosts, portfolio: string, ticker: string, averageCost: number): PortfolioAverageCosts {
  return { ...prev, [portfolio]: { ...(prev[portfolio] ?? {}), [ticker]: averageCost } };
}

/** Sets a cash balance from user input, clamped to a non-negative number. */
export function setCash(prev: PortfolioCash, portfolio: string, value: string | number): PortfolioCash {
  return { ...prev, [portfolio]: Math.max(0, Number(value) || 0) };
}

/**
 * Drops share counts for tickers that are no longer listed and for deleted portfolios. Never adds
 * shares: a listed ticker without an entry simply holds zero. Returns `prev` when nothing changes.
 */
export function pruneQuantities(prev: PortfolioQuantities, portfolios: PortfolioTickers): PortfolioQuantities {
  let changed = false;
  const next: PortfolioQuantities = {};
  for (const [name, holdings] of Object.entries(prev)) {
    const listed = portfolios[name];
    if (!listed) {
      changed = true;
      continue;
    }
    const kept = Object.fromEntries(Object.entries(holdings).filter(([ticker]) => listed.includes(ticker)));
    if (Object.keys(kept).length !== Object.keys(holdings).length) changed = true;
    next[name] = kept;
  }
  return changed ? next : prev;
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

/** Builds the persisted shape (current version). Holdings cover only listed portfolios; missing average costs save as 0. */
export function toPortfolioState(maps: {
  portfolios: PortfolioTickers;
  quantities: PortfolioQuantities;
  averageCosts: PortfolioAverageCosts;
  cash: PortfolioCash;
  transactions: PortfolioTransactions;
}): PortfolioState {
  const { portfolios, quantities, averageCosts, cash, transactions } = maps;
  const holdings = Object.fromEntries(Object.keys(portfolios).map(name => [name, Object.fromEntries(Object.entries(quantities[name] ?? {}).map(([ticker, quantity]) => [ticker, { quantity, averageCost: averageCosts[name]?.[ticker] ?? 0 }]))]));
  return { portfolios, holdings, cash, transactions, version: PORTFOLIO_STATE_VERSION };
}

// --- saved state: defaults, validation, migration ---

/**
 * Version of the saved shape. 2: stocks on the watchlist hold zero shares unless a holding was
 * entered (version 1, unversioned, gave every listed stock an automatic share).
 */
export const PORTFOLIO_STATE_VERSION = 2;

export const DEFAULT_PORTFOLIOS: PortfolioMap = { 'My Watchlist': ['AAPL', 'MSFT', 'NVDA'] };
export const DEFAULT_PORTFOLIO_STATE: PortfolioState = {
  portfolios: DEFAULT_PORTFOLIOS,
  holdings: { 'My Watchlist': {} },
  cash: { 'My Watchlist': 0 },
  transactions: { 'My Watchlist': [] },
  version: PORTFOLIO_STATE_VERSION,
};

const POPULAR_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'JPM', 'AMD', 'NFLX', 'WMT', 'JNJ'];

/** A fresh guest portfolio: four random popular stocks on the watchlist, no holdings. */
export function createGuestPortfolioState(): PortfolioState {
  const shuffled = [...POPULAR_TICKERS];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  const tickers = shuffled.slice(0, 4);
  return {
    portfolios: { 'Popular Picks': tickers },
    holdings: { 'Popular Picks': {} },
    cash: { 'Popular Picks': 0 },
    transactions: { 'Popular Picks': [] },
    version: PORTFOLIO_STATE_VERSION,
  };
}

/**
 * Removes the automatic shares that unversioned saves gave every watched stock. A holding is
 * treated as automatic only when it is exactly 1 share with no average cost and no transaction
 * for that stock in that portfolio; anything a user entered keeps an average cost or a
 * transaction, so real holdings are left alone.
 */
export function migrateLegacyHoldings(state: PortfolioState): PortfolioState {
  const holdings: HoldingMap = Object.fromEntries(Object.entries(state.holdings).map(([name, items]) => {
    const traded = new Set((state.transactions[name] ?? []).map(transaction => transaction.ticker));
    const kept = Object.entries(items).filter(([ticker, holding]) => {
      const automatic = holding.quantity === 1 && !(holding.averageCost > 0) && !traded.has(ticker);
      return !automatic;
    });
    return [name, Object.fromEntries(kept)];
  }));
  return { ...state, holdings, version: PORTFOLIO_STATE_VERSION };
}

/**
 * Validates a loaded record (local or cloud) and upgrades it to the current version. Falls back
 * to the default state for anything unusable; accepts the oldest shape (a bare portfolio map).
 */
export function normalizePortfolioState(value: unknown): PortfolioState {
  if (!value || typeof value !== 'object') return DEFAULT_PORTFOLIO_STATE;
  const candidate = value as Partial<PortfolioState>;
  const portfolios = candidate.portfolios && typeof candidate.portfolios === 'object'
    ? candidate.portfolios
    : value as PortfolioMap;
  if (!Object.values(portfolios).every(Array.isArray)) return DEFAULT_PORTFOLIO_STATE;
  const state: PortfolioState = {
    portfolios,
    holdings: candidate.holdings ?? Object.fromEntries(Object.keys(portfolios).map(name => [name, {}])),
    cash: candidate.cash ?? Object.fromEntries(Object.keys(portfolios).map(name => [name, 0])),
    transactions: candidate.transactions ?? Object.fromEntries(Object.keys(portfolios).map(name => [name, []])),
    version: PORTFOLIO_STATE_VERSION,
  };
  return candidate.version === undefined ? migrateLegacyHoldings(state) : state;
}
