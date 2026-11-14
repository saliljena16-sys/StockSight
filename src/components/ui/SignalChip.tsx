import { CircleDashed, Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import type { Recommendation } from '../../utils/technicalAnalysis';

const SIGNALS: Record<Recommendation, { label: string; tone: string; Icon: LucideIcon }> = {
  'STRONG BUY': { label: 'Strong buy', tone: 'border-gain/35 text-gain', Icon: TrendingUp },
  BUY: { label: 'Buy', tone: 'border-gain/35 text-gain', Icon: TrendingUp },
  HOLD: { label: 'Hold', tone: 'border-warn/35 text-warn', Icon: Minus },
  SELL: { label: 'Sell', tone: 'border-loss/35 text-loss', Icon: TrendingDown },
  'STRONG SELL': { label: 'Strong sell', tone: 'border-loss/35 text-loss', Icon: TrendingDown },
  UNAVAILABLE: { label: 'No signal', tone: 'text-ink-dim', Icon: CircleDashed },
};

/** The technical signal for a stock, as a small pill with an icon and a label. */
export default function SignalChip({ recommendation, className = '' }: { recommendation: Recommendation; className?: string }) {
  const { label, tone, Icon } = SIGNALS[recommendation];
  const hint = recommendation === 'UNAVAILABLE'
    ? 'No signal: at least 200 sessions of real price history are needed'
    : 'Technical signal from price trend, moving averages and RSI';
  return (
    <span className={`chip ${tone} ${className}`} title={hint}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
