import type { ReactNode } from 'react';

type Direction = 'up' | 'down' | 'flat';

/** Small solid arrow (or dash for no change) that accompanies every gain/loss figure. */
export function TrendArrow({ direction, className = '' }: { direction: Direction; className?: string }) {
  if (direction === 'flat') {
    return (
      <svg viewBox="0 0 10 10" aria-hidden="true" className={`h-2 w-2 shrink-0 ${className}`}>
        <rect x="1" y="4" width="8" height="2" rx="1" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true" className={`h-2 w-2 shrink-0 ${direction === 'down' ? 'rotate-180' : ''} ${className}`}>
      <path d="M5 1.5 9 8.5H1z" fill="currentColor" />
    </svg>
  );
}

export const directionOf = (value: number): Direction => (value > 0 ? 'up' : value < 0 ? 'down' : 'flat');

const TONE: Record<Direction, string> = { up: 'text-gain', down: 'text-loss', flat: 'text-ink-muted' };

interface DeltaProps {
  /** Signed amount that decides the direction (colour and arrow). */
  value: number;
  /** The formatted figure. It must carry its own + or - sign, so meaning never rests on colour. */
  children: ReactNode;
  className?: string;
}

/** A gain or loss figure: arrow + signed text, coloured by direction. */
export default function Delta({ value, children, className = '' }: DeltaProps) {
  const direction = directionOf(value);
  return (
    <span className={`num inline-flex items-center gap-1.5 whitespace-nowrap ${TONE[direction]} ${className}`}>
      <TrendArrow direction={direction} />
      {children}
    </span>
  );
}
