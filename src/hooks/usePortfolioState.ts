import { useEffect, useState } from 'react';
import { STARTER_STOCKS } from '../utils/mockData';
import { DEFAULT_PORTFOLIOS, type PortfolioState } from '../utils/portfolioDb';
import {
  addTicker,
  createHoldingTransaction,
  createPortfolioIn,
  omitKey,
  omitTicker,
  prependTransaction,
  removeTicker,
  renamePortfolioIn,
  sanitizeQuantity,
  setAverageCost,
  setCash,
  listTickerIfHeld,
  pruneQuantities,
  setQuantity,
  splitHoldings,
  type PortfolioMaps,
} from '../utils/portfolioState';
import type {
  PortfolioAverageCosts,
  PortfolioCash,
  PortfolioQuantities,
  PortfolioTickers,
  PortfolioTransactions,
} from '../types/portfolio';

/**
 * Portfolios, their holdings, cash and transactions, plus which portfolio and ticker are selected.
 * Each map is its own state slice; the actions below update them the same way App did.
 */
export function usePortfolioState() {
  const [selectedTicker, setSelectedTicker] = useState<string>(STARTER_STOCKS[0]);
  const [portfolios, setPortfolios] = useState<PortfolioTickers>(DEFAULT_PORTFOLIOS);
  const [activePortfolio, setActivePortfolio] = useState<string>('My Watchlist');
  const [portfolioQuantities, setPortfolioQuantities] = useState<PortfolioQuantities>({});
  const [portfolioAverageCosts, setPortfolioAverageCosts] = useState<PortfolioAverageCosts>({});
  const [portfolioCash, setPortfolioCash] = useState<PortfolioCash>({});
  const [portfolioTransactions, setPortfolioTransactions] = useState<PortfolioTransactions>({});

  const activeTickers = portfolios[activePortfolio] ?? [];

  /** Replaces everything with a loaded state and selects its first portfolio and ticker. */
  const applyPortfolioState = (saved: PortfolioState) => {
    const { quantities, averageCosts } = splitHoldings(saved.holdings);
    setPortfolios(saved.portfolios);
    setPortfolioQuantities(quantities);
    setPortfolioAverageCosts(averageCosts);
    setPortfolioCash(saved.cash);
    setPortfolioTransactions(saved.transactions);
    const firstPortfolio = Object.keys(saved.portfolios)[0];
    setActivePortfolio(firstPortfolio);
    setSelectedTicker(saved.portfolios[firstPortfolio]?.[0] ?? STARTER_STOCKS[0]);
  };

  /** Puts a ticker on the active portfolio's watchlist (with no shares) and selects it. */
  const addStock = (ticker: string) => {
    const upper = ticker.toUpperCase();
    setPortfolios(prev => addTicker(prev, activePortfolio, upper));
    setSelectedTicker(upper);
  };

  /** Sets a share count in the active portfolio and selects the ticker. Zero shares keeps it on the watchlist. */
  const updateStockQuantity = (ticker: string, nextQuantity: number) => {
    const upper = ticker.toUpperCase();
    const safeQuantity = sanitizeQuantity(nextQuantity);
    setPortfolios(prev => listTickerIfHeld(prev, activePortfolio, upper, safeQuantity));
    setPortfolioQuantities(prev => setQuantity(prev, activePortfolio, upper, safeQuantity));
    setSelectedTicker(upper);
  };

  /** Unlists a ticker from the active portfolio, moving the selection if it was selected. */
  const removeStock = (ticker: string) => {
    setPortfolios(prev => {
      const next = removeTicker(prev, activePortfolio, ticker);
      const remaining = next[activePortfolio];
      if (selectedTicker === ticker && remaining.length > 0) {
        setSelectedTicker(remaining[0]);
      }
      return next;
    });
    setPortfolioQuantities(prev => omitTicker(prev, activePortfolio, ticker));
    setPortfolioAverageCosts(prev => omitTicker(prev, activePortfolio, ticker));
  };

  /** Applies a holding edit: records a buy/sell for the share change, then sets shares and average cost. */
  const saveHolding = (ticker: string, quantity: number, averageCost: number) => {
    const previousQuantity = portfolioQuantities[activePortfolio]?.[ticker] ?? 0;
    const transaction = createHoldingTransaction(ticker, previousQuantity, quantity, averageCost);
    if (transaction) {
      setPortfolioTransactions(prev => prependTransaction(prev, activePortfolio, transaction));
    }
    updateStockQuantity(ticker, quantity);
    setPortfolioAverageCosts(prev => setAverageCost(prev, activePortfolio, ticker, averageCost));
  };

  const setCashBalance = (value: string) => {
    setPortfolioCash(prev => setCash(prev, activePortfolio, value));
  };

  const currentMaps = (): PortfolioMaps => ({
    portfolios,
    quantities: portfolioQuantities,
    averageCosts: portfolioAverageCosts,
    cash: portfolioCash,
    transactions: portfolioTransactions,
  });

  const applyMaps = (next: PortfolioMaps) => {
    setPortfolios(next.portfolios);
    setPortfolioQuantities(next.quantities);
    setPortfolioAverageCosts(next.averageCosts);
    setPortfolioCash(next.cash);
    setPortfolioTransactions(next.transactions);
  };

  /**
   * Creates an empty portfolio and makes it active. Returns false, changing nothing, when the
   * name clashes with an existing portfolio.
   */
  const createPortfolio = (name: string): boolean => {
    const next = createPortfolioIn(currentMaps(), name);
    if (!next) return false;
    applyMaps(next);
    setActivePortfolio(name);
    return true;
  };

  /**
   * Renames a portfolio and makes the new name active. Returns false, changing nothing, when the
   * new name clashes with another portfolio.
   */
  const renamePortfolio = (from: string, to: string): boolean => {
    const next = renamePortfolioIn(currentMaps(), from, to);
    if (!next) return false;
    applyMaps(next);
    setActivePortfolio(to);
    return true;
  };

  /** Deletes a portfolio and activates the first remaining one. */
  const deletePortfolio = (name: string) => {
    const nextPortfolios = omitKey(portfolios, name);
    const remaining = Object.keys(nextPortfolios);
    setPortfolios(nextPortfolios);
    setPortfolioQuantities(prev => omitKey(prev, name));
    setPortfolioAverageCosts(prev => omitKey(prev, name));
    setPortfolioCash(prev => omitKey(prev, name));
    setPortfolioTransactions(prev => omitKey(prev, name));
    setActivePortfolio(remaining[0] ?? 'My Watchlist');
  };

  // Keep the selection inside the active portfolio.
  useEffect(() => {
    const currentPortfolioTickers = portfolios[activePortfolio] ?? [];
    if (currentPortfolioTickers.length > 0 && !currentPortfolioTickers.includes(selectedTicker)) {
      setSelectedTicker(currentPortfolioTickers[0]);
    }
  }, [activePortfolio, portfolios, selectedTicker]);

  // Drop share counts for tickers that left the watchlist. Listed stocks without an entry hold zero.
  useEffect(() => {
    setPortfolioQuantities(prev => pruneQuantities(prev, portfolios));
  }, [portfolios]);

  return {
    selectedTicker,
    setSelectedTicker,
    portfolios,
    activePortfolio,
    setActivePortfolio,
    activeTickers,
    portfolioQuantities,
    portfolioAverageCosts,
    portfolioCash,
    portfolioTransactions,
    applyPortfolioState,
    addStock,
    removeStock,
    saveHolding,
    setCashBalance,
    createPortfolio,
    renamePortfolio,
    deletePortfolio,
  };
}
