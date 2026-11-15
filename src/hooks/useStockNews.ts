import { useEffect, useState } from 'react';
import { companyNewsParams, toCompanyNewsItems } from '../utils/news';
import { fetchFinnhub, isFinnhubKnownUnavailable, isFinnhubUnavailable } from '../utils/finnhub';
import type { NewsItem } from '../types/news';

/** The last week of Finnhub company news for `ticker` (none without a ticker or a server API key). */
export function useStockNews(ticker: string | undefined) {
  const [stockNews, setStockNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  useEffect(() => {
    if (!ticker) {
      setStockNews([]);
      return;
    }

    const fetchNews = async () => {
      // No server key (the proxy already answered 503): no news, and no loading state.
      if (isFinnhubKnownUnavailable()) {
        setStockNews([]);
        return;
      }

      setNewsLoading(true);

      try {
        const items = await fetchFinnhub('company-news', companyNewsParams(ticker));
        setStockNews(toCompanyNewsItems(items));
      } catch (error) {
        if (!isFinnhubUnavailable(error)) console.warn('Unable to load stock news:', error);
        setStockNews([]);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, [ticker]);

  return { stockNews, newsLoading };
}
