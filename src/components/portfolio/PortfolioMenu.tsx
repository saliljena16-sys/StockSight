import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Check, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { askForPortfolioName, suggestPortfolioName } from '../../utils/portfolioNames';

interface PortfolioMenuProps {
  portfolioNames: string[];
  activePortfolio: string;
  onSelectPortfolio: (name: string) => void;
  /** Returns false if the name was rejected (it never is after the prompt's own check). */
  onCreate: (name: string) => boolean;
  onRename: (from: string, to: string) => boolean;
  onDelete: (name: string) => void;
}

const ITEM = 'flex min-h-11 w-full items-center gap-3 rounded-control px-2.5 text-left text-sm text-ink hover:bg-canvas/70 focus-visible:bg-canvas/70 disabled:opacity-40 lg:min-h-9';

/**
 * The active portfolio's name as a menu button: switch portfolio, or rename, create or delete one.
 * Arrow keys move between items, Escape closes and returns focus to the button.
 */
export default function PortfolioMenu({ portfolioNames, activePortfolio, onSelectPortfolio, onCreate, onRename, onDelete }: PortfolioMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])');
    const current = menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    (current ?? items?.[0])?.focus();

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [open]);

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'ArrowDown' ? items[(index + 1) % items.length]
      : event.key === 'ArrowUp' ? items[(index - 1 + items.length) % items.length]
      : event.key === 'Home' ? items[0]
      : event.key === 'End' ? items[items.length - 1]
      : null;
    if (next) {
      event.preventDefault();
      next.focus();
    }
  };

  // Names that clash with another portfolio are refused with an explanation and the prompt is
  // shown again, so creating or renaming can never overwrite another portfolio's data.
  const handleCreatePortfolio = () => {
    close();
    const name = askForPortfolioName({
      ask: (message, defaultValue) => window.prompt(message, defaultValue),
      message: 'Create a portfolio name',
      defaultValue: suggestPortfolioName(portfolioNames),
      existingNames: portfolioNames,
    });
    if (name) onCreate(name);
  };

  const handleRenamePortfolio = () => {
    close();
    const name = askForPortfolioName({
      ask: (message, defaultValue) => window.prompt(message, defaultValue),
      message: 'Rename portfolio',
      defaultValue: activePortfolio,
      existingNames: portfolioNames,
      currentName: activePortfolio,
    });
    if (name) onRename(activePortfolio, name);
  };

  const handleDeletePortfolio = () => {
    close();
    if (portfolioNames.length <= 1) {
      window.alert('You must keep at least one portfolio.');
      return;
    }

    const confirmed = window.confirm(`Delete the portfolio "${activePortfolio}"?`);
    if (!confirmed) return;
    onDelete(activePortfolio);
  };

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Portfolio: ${activePortfolio}. Switch or manage portfolios`}
        onClick={() => setOpen(value => !value)}
        className="group -ml-2.5 flex min-h-11 max-w-full items-center gap-2 rounded-full px-2.5 hover:bg-raised lg:min-h-9"
      >
        <span className="eyebrow truncate text-ink-muted group-hover:text-ink">{activePortfolio}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-ink-dim transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Portfolios"
          onKeyDown={handleMenuKeyDown}
          className="absolute left-0 top-full z-30 mt-1.5 w-[min(18rem,calc(100vw-2rem))] rounded-panel border border-line-strong bg-raised p-1.5 shadow-pop"
        >
          <p className="eyebrow px-2.5 pb-1.5 pt-2">Portfolios</p>
          {portfolioNames.map(name => (
            <button
              key={name}
              type="button"
              role="menuitemradio"
              aria-checked={name === activePortfolio}
              onClick={() => { onSelectPortfolio(name); close(); }}
              className={`${ITEM} justify-between`}
            >
              <span className="truncate">{name}</span>
              {name === activePortfolio && <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />}
            </button>
          ))}
          <div className="my-1.5 border-t border-line" role="separator" />
          <button type="button" role="menuitem" onClick={handleRenamePortfolio} className={ITEM}>
            <Pencil className="h-4 w-4 shrink-0 text-ink-dim" aria-hidden="true" />Rename this portfolio
          </button>
          <button type="button" role="menuitem" onClick={handleCreatePortfolio} className={ITEM}>
            <Plus className="h-4 w-4 shrink-0 text-ink-dim" aria-hidden="true" />New portfolio
          </button>
          <button type="button" role="menuitem" onClick={handleDeletePortfolio} disabled={portfolioNames.length <= 1} className={`${ITEM} text-loss`}>
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />Delete this portfolio
          </button>
        </div>
      )}
    </div>
  );
}
