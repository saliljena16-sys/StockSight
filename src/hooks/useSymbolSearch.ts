import { useEffect, useRef, useState } from 'react';
import { isSearchShortcut, resolveSymbolSearch } from '../utils/symbolSearch';

interface SymbolSearchOptions {
  activeTickers: string[];
  onSelect: (ticker: string) => void;
  onAdd: (ticker: string) => void;
}

/**
 * The header symbol search. Ctrl/Cmd+K focuses the search field (one input serves every width);
 * submitting selects a listed ticker or adds a new one.
 */
export function useSymbolSearch({ activeTickers, onSelect, onAdd }: SymbolSearchOptions) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleCommandSearch = (event: KeyboardEvent) => {
      if (isSearchShortcut(event)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleCommandSearch);
    return () => window.removeEventListener('keydown', handleCommandSearch);
  }, []);

  const submit = () => {
    const action = resolveSymbolSearch(query, activeTickers);
    if (action.type === 'none') return;
    if (action.type === 'select') {
      onSelect(action.ticker);
    } else {
      onAdd(action.ticker);
    }
    setQuery('');
  };

  return { query, setQuery, submit, inputRef };
}
