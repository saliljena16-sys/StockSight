import type { RefObject } from 'react';
import { Search } from 'lucide-react';

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef: RefObject<HTMLInputElement>;
}

/** Symbol search shown below lg, where the header search is hidden. */
export default function MobileSearchBar({ value, onChange, onSubmit, inputRef }: MobileSearchBarProps) {
  return (
    <div className="border-b border-white/[.08] bg-[#090d0f] px-3 py-3 lg:hidden">
      <div className="relative mx-auto max-w-[1680px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onSubmit()}
          placeholder="Search a symbol, e.g. AAPL"
          aria-label="Search symbols or companies"
          className="h-11 w-full rounded-[9px] border border-white/[.1] bg-[var(--surface-1)] pl-10 pr-4 text-base text-white placeholder:text-sm placeholder:text-[var(--text-tertiary)] focus:border-lime-300/35 focus:outline-none"
        />
      </div>
    </div>
  );
}
