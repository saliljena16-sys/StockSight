/** A news article as returned by Finnhub's /company-news and /news endpoints. */
export interface NewsItem {
  headline: string;
  summary: string;
  url: string;
  source: string;
  datetime: number;
  image?: string;
}
