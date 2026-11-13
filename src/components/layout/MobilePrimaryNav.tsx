import type { PrimaryView } from '../../types/views';

interface MobilePrimaryNavProps {
  primaryView: PrimaryView;
  onNavigate: (view: PrimaryView) => void;
}

/** Primary navigation below the header on screens narrower than xl. */
export default function MobilePrimaryNav({ primaryView, onNavigate }: MobilePrimaryNavProps) {
  return (
    <nav className="mobile-scroll sticky top-16 z-30 flex overflow-x-auto border-b border-white/[.08] bg-[#090d0f]/95 px-1 backdrop-blur-xl sm:top-[72px] sm:px-4 xl:hidden" aria-label="Primary navigation">
      {([['Watchlist', 'watchlist'], ['Markets', 'markets'], ['Screeners', 'screeners'], ['News', 'news'], ['Analytics', 'analytics']] as Array<[string, PrimaryView]>).map(([label, view]) => (
        <button key={view} type="button" onClick={() => onNavigate(view)} aria-current={primaryView === view ? 'page' : undefined} className={`min-h-11 flex-1 shrink-0 whitespace-nowrap border-b-2 px-1.5 text-xs font-medium min-[380px]:px-2.5 min-[380px]:text-[13px] sm:px-4 sm:text-sm ${primaryView === view ? 'border-lime-300 text-white' : 'border-transparent text-[var(--text-secondary)] hover:text-white'}`}>{label}</button>
      ))}
    </nav>
  );
}
