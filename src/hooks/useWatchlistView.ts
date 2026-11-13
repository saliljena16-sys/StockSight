import { useState } from 'react';
import type { DetailTab, WatchlistTableTab, WatchlistViewMode } from '../types/views';

/**
 * How the watchlist is shown: cards or a table (and which table tab), plus the detail panel's
 * active tab. Lives at the app level so the choice survives switching primary views.
 */
export function useWatchlistView() {
  const [activeTab, setActiveTab] = useState<DetailTab>('chart');
  const [viewMode, setViewMode] = useState<WatchlistViewMode>('cards');
  const [tableTab, setTableTab] = useState<WatchlistTableTab>('holdings');

  /** Opens a table tab; the detail panel returns to the price chart. */
  const showTableTab = (tab: WatchlistTableTab) => {
    setTableTab(tab);
    setViewMode('table');
    setActiveTab('chart');
  };

  const showCards = () => {
    setViewMode('cards');
  };

  /** Switches to the table; the detail panel returns to the price chart. */
  const showTable = () => {
    setViewMode('table');
    setActiveTab('chart');
  };

  return { activeTab, setActiveTab, viewMode, tableTab, showTableTab, showCards, showTable };
}
