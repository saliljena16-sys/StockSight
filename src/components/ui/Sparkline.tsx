interface SparklineProps {
  /** Recent closing prices, oldest first. Nothing is drawn with fewer than two. */
  values: number[];
  /** Whether the stock is up today (decides the line colour; the figure next to it carries the sign). */
  positive: boolean;
  className?: string;
}

/** Tiny decorative price line for a list row. */
export default function Sparkline({ values, positive, className = '' }: SparklineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values
    .map((value, index) => `${(index / (values.length - 1)) * 100},${30 - ((value - min) / Math.max(max - min, 1)) * 26}`)
    .join(' ');

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" className={`h-6 w-12 shrink-0 ${className}`}>
      <polyline points={points} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className={positive ? 'stroke-gain' : 'stroke-loss'} />
    </svg>
  );
}
