/** A recorded change to a holding, newest first in each portfolio's list. */
export interface Transaction {
  id: string;
  ticker: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: string;
}

// Portfolio state is kept as parallel maps keyed by portfolio name.

/** Portfolio name → tickers shown in that portfolio. */
export type PortfolioTickers = Record<string, string[]>;
/** Portfolio name → ticker → share count. */
export type PortfolioQuantities = Record<string, Record<string, number>>;
/** Portfolio name → ticker → average cost per share. */
export type PortfolioAverageCosts = Record<string, Record<string, number>>;
/** Portfolio name → cash balance. */
export type PortfolioCash = Record<string, number>;
/** Portfolio name → transactions, newest first. */
export type PortfolioTransactions = Record<string, Transaction[]>;
