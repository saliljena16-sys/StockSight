import type { WatchlistTableTab, WatchlistViewMode } from '../../types/views';

interface WatchlistToolbarProps {
  viewMode: WatchlistViewMode;
  tableTab: WatchlistTableTab;
  onSelectTableTab: (tab: WatchlistTableTab) => void;
  onShowCards: () => void;
  onShowTable: () => void;
}

/** Table tabs (Summary, Holdings, Key Stats, Performance) and the Cards/Table switch. */
export default function WatchlistToolbar({ viewMode, tableTab, onSelectTableTab, onShowCards, onShowTable }: WatchlistToolbarProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-white/[.08] sm:flex-row sm:items-end sm:justify-between">
      <nav className="mobile-scroll flex items-center gap-3.5 overflow-x-auto min-[380px]:gap-5" aria-label="Portfolio views">
        {[
          { label: 'Summary', value: 'summary' },
          { label: 'Holdings', value: 'holdings' },
          { label: 'Key Stats', value: 'keyStats' },
          { label: 'Performance', value: 'performance' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => onSelectTableTab(tab.value as WatchlistTableTab)}
            aria-pressed={viewMode === 'table' && tableTab === tab.value}
            className={`min-h-11 whitespace-nowrap border-b-2 text-[13px] font-medium min-[380px]:text-sm ${viewMode === 'table' && tableTab === tab.value ? 'border-lime-300 text-white' : 'border-transparent text-[var(--text-secondary)] hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mb-2 flex items-center gap-1 rounded-[8px] border border-white/[.1] bg-white/[.025] p-1">
        <button onClick={onShowCards} className={`min-h-9 rounded-[6px] px-3 text-sm font-medium ${viewMode === 'cards' ? 'bg-white/[.1] text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}>Cards</button>
        <button onClick={onShowTable} className={`min-h-9 rounded-[6px] px-3 text-sm font-medium ${viewMode === 'table' ? 'bg-white/[.1] text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}>Table</button>
      </div>
    </div>
  );
}
