import { useEffect, useState } from 'react';
import { STARTER_STOCKS } from '../utils/mockData';
import { DEFAULT_PORTFOLIOS, type PortfolioState } from '../utils/portfolioDb';
import {
  addPortfolio,
  addTicker,
  createHoldingTransaction,
  incrementQuantity,
  moveEntry,
  omitKey,
  omitTicker,
  prependTransaction,
  removeTicker,
  renamePortfolioTickers,
  sanitizeQuantity,
  setAverageCost,
  setCash,
  setQuantity,
  setTickerListed,
  splitHoldings,
  syncQuantitiesWithPortfolios,
  withEntry,
} from '../utils/portfolioState';
import type {
  PortfolioAverageCosts,
  PortfolioCash,
  PortfolioQuantities,
  PortfolioTickers,
  PortfolioTransactions,
  Transaction,
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

  /** Lists a ticker in the active portfolio, adds one share, and selects it. */
  const addStock = (ticker: string) => {
    const upper = ticker.toUpperCase();
    setPortfolios(prev => addTicker(prev, activePortfolio, upper));
    setPortfolioQuantities(prev => incrementQuantity(prev, activePortfolio, upper));
    setSelectedTicker(upper);
  };

  /** Sets a share count in the active portfolio (zero unlists the ticker) and selects it. */
  const updateStockQuantity = (ticker: string, nextQuantity: number) => {
    const upper = ticker.toUpperCase();
    const safeQuantity = sanitizeQuantity(nextQuantity);
    setPortfolios(prev => setTickerListed(prev, activePortfolio, upper, safeQuantity));
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

  /** Creates (or, if the name exists, resets the holdings of) a portfolio and makes it active. */
  const createPortfolio = (name: string) => {
    setPortfolios(prev => addPortfolio(prev, name));
    setPortfolioQuantities(prev => withEntry(prev, name, {}));
    setPortfolioAverageCosts(prev => withEntry(prev, name, {}));
    setPortfolioCash(prev => withEntry(prev, name, 0));
    setPortfolioTransactions(prev => withEntry<Transaction[]>(prev, name, []));
    setActivePortfolio(name);
  };

  /** Renames a portfolio and makes the new name active. */
  const renamePortfolio = (from: string, to: string) => {
    setPortfolios(prev => renamePortfolioTickers(prev, from, to));
    setPortfolioQuantities(prev => moveEntry(prev, from, to, {}));
    setPortfolioAverageCosts(prev => moveEntry(prev, from, to, {}));
    setPortfolioCash(prev => moveEntry(prev, from, to, 0));
    setPortfolioTransactions(prev => moveEntry<Transaction[]>(prev, from, to, []));
    setActivePortfolio(to);
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

  // Keep share counts in step with which tickers are listed.
  useEffect(() => {
    setPortfolioQuantities(prev => syncQuantitiesWithPortfolios(prev, portfolios));
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
