export type SymbolSearchAction =
  | { type: 'none' }
  | { type: 'select'; ticker: string }
  | { type: 'add'; ticker: string };

/**
 * What submitting the symbol search should do: nothing for a blank query, select a ticker that is
 * already in the active portfolio, otherwise add it.
 */
export function resolveSymbolSearch(query: string, activeTickers: string[]): SymbolSearchAction {
  const ticker = query.trim().toUpperCase();
  if (!ticker) return { type: 'none' };
  return activeTickers.includes(ticker) ? { type: 'select', ticker } : { type: 'add', ticker };
}

/** Ctrl+K / Cmd+K. */
export function isSearchShortcut(event: Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'key'>): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
}
