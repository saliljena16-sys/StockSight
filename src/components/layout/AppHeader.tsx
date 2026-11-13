import type { RefObject } from 'react';
import { BarChart3, Loader2, Plus, RefreshCw, Search, UserRound, WifiOff } from 'lucide-react';
import type { PrimaryView } from '../../types/views';

interface AppHeaderProps {
  primaryView: PrimaryView;
  onNavigate: (view: PrimaryView) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  searchInputRef: RefObject<HTMLInputElement>;
  hasLiveData: boolean;
  allLiveData: boolean;
  isLoading: boolean;
  lastUpdate: Date;
  isRefreshing: boolean;
  onRefresh: () => void;
  userEmail: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onAddStock: () => void;
}

/** Sticky top bar: brand, desktop navigation and search, data status, refresh, account, add stock. */
export default function AppHeader({
  primaryView,
  onNavigate,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchInputRef,
  hasLiveData,
  allLiveData,
  isLoading,
  lastUpdate,
  isRefreshing,
  onRefresh,
  userEmail,
  onSignIn,
  onSignOut,
  onAddStock,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[.09] bg-[#090d0f]/95 backdrop-blur-xl">
      <div className="mx-auto w-[calc(100%-24px)] max-w-[1680px] sm:w-[calc(100%-32px)] xl:w-[calc(100%-48px)]">
        <div className="flex h-16 items-center gap-3 sm:h-[72px] sm:gap-6">
          <div className="flex shrink-0 items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-[8px] bg-lime-300 text-[#09100b] sm:h-10 sm:w-10">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-[17px] font-semibold leading-5 tracking-[-.03em] text-white">StockSight</h1>
              <p className="hidden text-[10px] uppercase tracking-[.18em] text-[#727b74] min-[370px]:block">Market workspace</p>
            </div>
          </div>

          <nav className="hidden h-full items-center gap-7 xl:flex" aria-label="Primary navigation">
            <button
              type="button"
              aria-current={primaryView === 'watchlist' ? 'page' : undefined}
              onClick={() => { onNavigate('watchlist'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`relative h-full text-sm font-medium focus-visible:rounded-sm ${primaryView === 'watchlist' ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-lime-300' : 'text-[var(--text-secondary)] hover:text-white'}`}
            >
              Watchlist
            </button>
            {([['Markets', 'markets'], ['Screeners', 'screeners'], ['News', 'news'], ['Analytics', 'analytics']] as Array<[string, PrimaryView]>).map(([item, view]) => (
              <button
                key={item}
                type="button"
                aria-current={primaryView === view ? 'page' : undefined}
                onClick={() => { onNavigate(view); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`relative h-full text-sm font-medium ${primaryView === view ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-lime-300' : 'text-[var(--text-secondary)] hover:text-white'}`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="relative ml-auto hidden min-w-[240px] max-w-[360px] flex-1 lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && onSearchSubmit()}
              placeholder="Search symbols, companies, or ideas…"
              aria-label="Search symbols, companies, or ideas"
              className="h-10 w-full rounded-[8px] border border-white/[.1] bg-[var(--surface-1)] pl-10 pr-16 text-sm text-white placeholder:text-[var(--text-tertiary)] focus:border-lime-300/35 focus:outline-none"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-white/[.1] bg-white/[.035] px-1.5 py-0.5 font-sans text-[10px] text-[var(--text-tertiary)]">Ctrl K</kbd>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 md:flex">
              {hasLiveData ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-[var(--positive)]" />
                  <span className="leading-tight">
                    <span className={`block text-[11px] font-semibold uppercase tracking-[.06em] ${allLiveData ? 'text-[var(--positive)]' : 'text-[var(--warning)]'}`}>{allLiveData ? 'Market open' : 'Partial data'}</span>
                    <span className="hidden text-[10px] text-[var(--text-tertiary)] 2xl:block">Finnhub + Yahoo</span>
                  </span>
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="w-3 h-3 text-[#89918b] animate-spin" />
                  <span className="text-[#89918b]">Syncing data</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-500" />
                  <span className="text-[#e4b75c]">Demo data</span>
                </>
              )}
            </div>

            <div className="hidden xl:flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
              <span>{lastUpdate.toLocaleTimeString()}</span>
            </div>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh data"
              className="grid h-10 w-10 place-items-center rounded-[8px] border border-white/[.1] bg-white/[.025] hover:bg-white/[.06] disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button onClick={userEmail ? onSignOut : onSignIn} aria-label={userEmail ? `Account: ${userEmail}. Sign out` : 'Sign in'} title={userEmail ?? 'Sign in'} className="grid h-10 w-10 place-items-center rounded-full border border-white/[.16] bg-white/[.035] text-[var(--text-secondary)] hover:border-white/25 hover:text-white">
              {userEmail ? <span className="text-xs font-semibold text-white">{userEmail.charAt(0).toUpperCase()}</span> : <UserRound className="h-4 w-4" />}
            </button>

            <button
              onClick={onAddStock}
              aria-label="Add stock"
              className="flex h-10 min-w-10 items-center justify-center gap-2 rounded-[8px] bg-lime-300 px-0 text-sm font-semibold text-[#10140f] hover:bg-lime-200 sm:px-4"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Stock</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
