import { useEffect, useRef, useState } from 'react';
import { isSearchShortcut, resolveSymbolSearch } from '../utils/symbolSearch';

interface SymbolSearchOptions {
  activeTickers: string[];
  onSelect: (ticker: string) => void;
  onAdd: (ticker: string) => void;
}

/**
 * The header symbol search, shared by the desktop and mobile inputs. Ctrl/Cmd+K focuses whichever
 * input is visible; submitting selects a listed ticker or adds a new one.
 */
export function useSymbolSearch({ activeTickers, onSelect, onAdd }: SymbolSearchOptions) {
  const [query, setQuery] = useState('');
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleCommandSearch = (event: KeyboardEvent) => {
      if (isSearchShortcut(event)) {
        event.preventDefault();
        (window.innerWidth < 1024 ? mobileInputRef.current : desktopInputRef.current)?.focus();
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

  return { query, setQuery, submit, desktopInputRef, mobileInputRef };
}
