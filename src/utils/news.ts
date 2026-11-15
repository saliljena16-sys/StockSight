import type { NewsItem } from '../types/news';

export const COMPANY_NEWS_DAYS = 7;
export const COMPANY_NEWS_LIMIT = 5;

/** Finnhub company-news query covering the last seven days up to `now`. */
export function companyNewsParams(ticker: string, now: Date = new Date()): { symbol: string; from: string; to: string } {
  const from = new Date(now.getTime() - COMPANY_NEWS_DAYS * 24 * 60 * 60 * 1000);
  return { symbol: ticker, from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

/** The first few articles of a company-news response; anything that isn't a list yields none. */
export function toCompanyNewsItems(payload: unknown): NewsItem[] {
  return Array.isArray(payload) ? payload.slice(0, COMPANY_NEWS_LIMIT) : [];
}
