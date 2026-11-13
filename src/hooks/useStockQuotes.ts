import { useState } from 'react';
import useSWR from 'swr';
import { getStockInfo, type StockInfo } from '../utils/mockData';

const fetcher = async (ticker: string): Promise<StockInfo> => {
  return getStockInfo(ticker);
};

/**
 * Quotes and daily history for `tickers` (getStockInfo fetches both), refreshed every 60 seconds
 * and on focus. Exposes when data last arrived and a manual refresh.
 */
export function useStockQuotes(tickers: string[]) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: stocksData, isLoading, mutate } = useSWR(
    tickers.length > 0 ? tickers : null,
    async (keys: string[]) => {
      const results = await Promise.all(keys.map(k => fetcher(k)));
      setLastUpdate(new Date());
      return results;
    },
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      revalidateIfStale: true,
    }
  );

  const refresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
  };

  const hasLiveData = stocksData?.some(s => s.isLiveData) ?? false;
  const allLiveData = stocksData?.every(s => s.isLiveData) ?? false;

  return { stocksData, isLoading, lastUpdate, isRefreshing, refresh, hasLiveData, allLiveData };
}
