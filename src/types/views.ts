/**
 * Top-level views in the primary navigation. "insights" holds what used to be three thin views
 * (Markets, Screeners, Analytics), each of which only looked at the stocks in the portfolio.
 */
export type PrimaryView = 'portfolio' | 'insights' | 'news';

/** Tabs in the selected-stock detail panel. */
export type DetailTab = 'chart' | 'analysis' | 'forecast' | 'compare';

/** How the watchlist is shown. */
export type WatchlistViewMode = 'cards' | 'table';

/** Tabs of the watchlist table view. */
export type WatchlistTableTab = 'summary' | 'holdings' | 'keyStats' | 'performance';
