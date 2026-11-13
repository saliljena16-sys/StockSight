import { useEffect, useState } from 'react';
import type { StockInfo } from '../utils/mockData';
import { ALL_SECTORS, filterStocksBySector, getAvailableSectors, shouldResetSectorFilter } from '../utils/sectorFilter';

/** The watchlist table's sector selection; falls back to "All" when the chosen sector disappears. */
export function useSectorFilter(stocksData: StockInfo[] | undefined) {
  const [sectorFilter, setSectorFilter] = useState<string>(ALL_SECTORS);

  const filteredStocks = filterStocksBySector(stocksData, sectorFilter);
  const availableSectors = getAvailableSectors(stocksData);

  useEffect(() => {
    if (shouldResetSectorFilter(stocksData, sectorFilter)) {
      setSectorFilter(ALL_SECTORS);
    }
  }, [stocksData, sectorFilter]);

  return { sectorFilter, setSectorFilter, filteredStocks, availableSectors };
}
