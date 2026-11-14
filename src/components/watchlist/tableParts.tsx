import type { ReactNode } from 'react';
import CompanyMark from '../CompanyMark';

/** Text colour for a signed figure. The figure itself always carries its + or - sign. */
export const toneOf = (value: number) => (value > 0 ? 'text-gain' : value < 0 ? 'text-loss' : 'text-ink-muted');

export const TABLE_CLASS = 'data-table min-w-full border-separate border-spacing-0 text-left text-ink-muted';
export const HEAD_CELL_CLASS = 'whitespace-nowrap border-b border-line px-3 py-3';

/** Props for a clickable table row that selects a stock (mouse); the symbol button does it for keyboards. */
export const rowProps = (ticker: string, selectedTicker: string, onSelect: (ticker: string) => void) => ({
  'data-selected': ticker === selectedTicker,
  className: 'cursor-pointer hover:bg-raised data-[selected=true]:bg-raised',
  onClick: () => onSelect(ticker),
});

interface SymbolCellProps {
  ticker: string;
  selected: boolean;
  onSelect: (ticker: string) => void;
  /** Second line under the ticker (company name). */
  sub?: string;
  /** Extra marker next to the ticker (e.g. a "Demo" pill). */
  badge?: ReactNode;
}

/** First column of every portfolio table: logo and ticker as a button, with an accent bar when selected. */
export function SymbolCell({ ticker, selected, onSelect, sub, badge }: SymbolCellProps) {
  return (
    <td className={`border-l-2 py-1 pl-3 pr-2 !text-left sm:pr-3 ${selected ? 'border-accent' : 'border-transparent'}`}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={(event) => { event.stopPropagation(); onSelect(ticker); }}
        className="flex min-h-11 items-center gap-2.5 text-left sm:min-w-[10rem] lg:min-h-9"
      >
        <CompanyMark ticker={ticker} size={24} />
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-medium text-ink">{ticker}{badge}</span>
          {/* On phones the sticky first column is just logo and ticker, leaving room for the figures. */}
          {sub && <span className="hidden max-w-[9rem] truncate font-sans text-xs text-ink-muted sm:block">{sub}</span>}
        </span>
      </button>
    </td>
  );
}
