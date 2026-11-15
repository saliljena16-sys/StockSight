/**
 * The StockSight wordmark with its coral dot (the same mark style as salil.best). Not a heading:
 * each view has its own h1.
 */
export default function Logo() {
  return (
    <div className="flex shrink-0 items-baseline gap-1 text-[17px] font-semibold leading-none tracking-[-0.035em] text-ink">
      StockSight
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
    </div>
  );
}
