import { useState } from 'react';
import type { DetailTab, WatchlistTableTab } from '../types/views';

/**
 * Which tab the stock detail panel shows and which portfolio table is open. Lives at the app
 * level so the choice survives switching primary views.
 */
export function useWatchlistView() {
  const [activeTab, setActiveTab] = useState<DetailTab>('chart');
  const [tableTab, setTableTab] = useState<WatchlistTableTab>('holdings');

  return { activeTab, setActiveTab, tableTab, setTableTab };
}
