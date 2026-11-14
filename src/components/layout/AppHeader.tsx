import { useState, type RefObject } from 'react';
import { Loader2, RefreshCw, Search, UserRound } from 'lucide-react';
import type { PrimaryView } from '../../types/views';
import Logo from '../ui/Logo';
import { NAV_ITEMS } from './navItems';

interface AppHeaderProps {
  primaryView: PrimaryView;
  onNavigate: (view: PrimaryView) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  searchInputRef: RefObject<HTMLInputElement>;
  /** Quotes have loaded for this portfolio (false while loading, or when it has no stocks). */
  hasQuotes: boolean;
  hasLiveData: boolean;
  allLiveData: boolean;
  isLoading: boolean;
  lastUpdate: Date;
  isRefreshing: boolean;
  onRefresh: () => void;
  userEmail: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

/**
 * Sticky top bar: wordmark, navigation (tablet and up), symbol search, data status, refresh and
 * account. On phones the search field is a drawer under the bar that opens when it has focus,
 * so one input serves every width and Ctrl/Cmd+K always lands in it.
 */
export default function AppHeader({
  primaryView,
  onNavigate,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchInputRef,
  hasQuotes,
  hasLiveData,
  allLiveData,
  isLoading,
  lastUpdate,
  isRefreshing,
  onRefresh,
  userEmail,
  onSignIn,
  onSignOut,
}: AppHeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  const toggleSearch = () => {
    const input = searchInputRef.current;
    if (!input) return;
    if (document.activeElement === input) input.blur();
    else input.focus();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/75 backdrop-blur-xl">
      <div className="relative mx-auto flex h-14 w-full max-w-[1600px] items-center gap-2 px-4 sm:px-6 md:h-16 md:gap-4 lg:px-8">
        <Logo />

        <nav className="ml-2 hidden items-center md:flex lg:ml-4" aria-label="Primary navigation">
          {NAV_ITEMS.map(({ view, label }) => (
            <button
              key={view}
              type="button"
              aria-current={primaryView === view ? 'page' : undefined}
              onClick={() => onNavigate(view)}
              className="nav-link"
            >
              {label}
            </button>
          ))}
        </nav>

        <div
          data-open={searchFocused}
          className="absolute inset-x-0 top-full border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur-xl transition-[opacity,transform] duration-150 max-md:pointer-events-none max-md:-translate-y-1 max-md:opacity-0 max-md:data-[open=true]:pointer-events-auto max-md:data-[open=true]:translate-y-0 max-md:data-[open=true]:opacity-100 md:static md:ml-auto md:w-full md:max-w-[15rem] md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none lg:max-w-xs xl:max-w-sm"
        >
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden="true" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && onSearchSubmit()}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Find or add a symbol"
              aria-label="Find or add a symbol"
              enterKeyHint="search"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="field rounded-full pl-10 lg:h-10 lg:pr-16"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-[5px] border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-dim lg:block">Ctrl K</kbd>
          </label>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          <div className="hidden items-center gap-2 pr-1 lg:flex">
            {hasLiveData ? (
              <>
                <span className={`h-1.5 w-1.5 rounded-full ${allLiveData ? 'bg-gain' : 'bg-warn'}`} aria-hidden="true" />
                <span className={`eyebrow ${allLiveData ? 'text-gain' : 'text-warn'}`}>{allLiveData ? 'Live' : 'Partial data'}</span>
              </>
            ) : isLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-ink-dim" aria-hidden="true" />
                <span className="eyebrow">Syncing</span>
              </>
            ) : hasQuotes ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-warn" aria-hidden="true" />
                <span className="eyebrow text-warn">Demo data</span>
              </>
            ) : null}
            <span className="num hidden text-xs text-ink-dim xl:inline" title="Last update">{lastUpdate.toLocaleTimeString()}</span>
          </div>

          <button
            type="button"
            className="icon-btn md:hidden"
            aria-label="Search"
            aria-expanded={searchFocused}
            onPointerDown={(event) => event.preventDefault()}
            onClick={toggleSearch}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh data"
            title="Refresh data"
            className="icon-btn"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={userEmail ? onSignOut : onSignIn}
            aria-label={userEmail ? `Account: ${userEmail}. Sign out` : 'Sign in'}
            title={userEmail ?? 'Sign in'}
            className="icon-btn"
          >
            {userEmail ? <span className="text-xs font-semibold text-ink">{userEmail.charAt(0).toUpperCase()}</span> : <UserRound className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
