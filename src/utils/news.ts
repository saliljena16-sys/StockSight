import type { NewsItem } from '../types/news';

export const COMPANY_NEWS_DAYS = 7;
export const COMPANY_NEWS_LIMIT = 5;

/** Finnhub company-news URL covering the last seven days up to `now`. */
export function buildCompanyNewsUrl(ticker: string, token: string, now: Date = new Date()): string {
  const from = new Date(now.getTime() - COMPANY_NEWS_DAYS * 24 * 60 * 60 * 1000);
  const fromDate = from.toISOString().slice(0, 10);
  const toDate = now.toISOString().slice(0, 10);
  return `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${fromDate}&to=${toDate}&token=${token}`;
}

/** The first few articles of a company-news response; anything that isn't a list yields none. */
export function toCompanyNewsItems(payload: unknown): NewsItem[] {
  return Array.isArray(payload) ? payload.slice(0, COMPANY_NEWS_LIMIT) : [];
}
