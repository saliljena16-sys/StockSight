import { useEffect, useState } from 'react';
import { buildCompanyNewsUrl, toCompanyNewsItems } from '../utils/news';
import type { NewsItem } from '../types/news';

/** The last week of Finnhub company news for `ticker` (none without a ticker or API key). */
export function useStockNews(ticker: string | undefined) {
  const [stockNews, setStockNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  useEffect(() => {
    if (!ticker) {
      setStockNews([]);
      return;
    }

    const fetchNews = async () => {
      const token = import.meta.env.VITE_FINNHUB_API_KEY;
      if (!token) {
        setStockNews([]);
        return;
      }

      setNewsLoading(true);

      try {
        const response = await fetch(buildCompanyNewsUrl(ticker, token));

        if (!response.ok) {
          throw new Error(`News request failed: ${response.status}`);
        }

        const items = await response.json();
        setStockNews(toCompanyNewsItems(items));
      } catch (error) {
        console.warn('Unable to load stock news:', error);
        setStockNews([]);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, [ticker]);

  return { stockNews, newsLoading };
}
