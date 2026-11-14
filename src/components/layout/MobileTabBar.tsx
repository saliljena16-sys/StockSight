import type { PrimaryView } from '../../types/views';
import { NAV_ITEMS } from './navItems';

interface MobileTabBarProps {
  primaryView: PrimaryView;
  onNavigate: (view: PrimaryView) => void;
}

/** Primary navigation on phones: a fixed bottom bar within thumb reach. Hidden from tablet width up. */
export default function MobileTabBar({ primaryView, onNavigate }: MobileTabBarProps) {
  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-3">
        {NAV_ITEMS.map(({ view, label, Icon }) => {
          const active = primaryView === view;
          return (
            <button
              key={view}
              type="button"
              onClick={() => onNavigate(view)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? 'text-ink' : 'text-ink-muted'}`}
            >
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" aria-hidden="true" />}
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
