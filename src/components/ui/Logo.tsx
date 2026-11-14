/** The StockSight wordmark with its coral dot (the same mark style as salil.best). */
export default function Logo() {
  return (
    <h1 className="flex shrink-0 items-baseline gap-1 text-[17px] font-semibold leading-none tracking-[-0.035em] text-ink">
      StockSight
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
    </h1>
  );
}
