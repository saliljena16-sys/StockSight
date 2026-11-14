import type { CSSProperties, ReactNode } from 'react';
import { Plus } from 'lucide-react';
import type { PortfolioSummary } from '../../utils/portfolioMetrics';
import { formatCurrency, formatSignedCurrency, formatSignedPercent } from '../../utils/format';
import Delta, { directionOf } from '../ui/Delta';
import PortfolioMenu from './PortfolioMenu';

interface PortfolioHeroProps {
  portfolioNames: string[];
  activePortfolio: string;
  onSelectPortfolio: (name: string) => void;
  onCreate: (name: string) => boolean;
  onRename: (from: string, to: string) => boolean;
  onDelete: (name: string) => void;
  summary: PortfolioSummary;
  /** Quotes are still loading, so the figures are shown as placeholders. */
  loading: boolean;
  /** At least one stock in this portfolio has shares entered. */
  hasHoldings: boolean;
  /** How many stocks this portfolio is watching (with or without shares). */
  watchedCount: number;
  /** Some or all of the prices behind the figures are simulated demo data. */
  hasSimulatedPrices: boolean;
  signedIn: boolean;
  onAddHolding: () => void;
  onLoadSample: () => void;
}

const TONE = { up: 'text-gain', down: 'text-loss', flat: 'text-ink-muted' } as const;

function Stat({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 text-sm text-ink sm:text-[15px]">{children}</dd>
    </div>
  );
}

/** A dollar change with its percentage. The percentage may wrap under the amount on narrow screens. */
function Change({ amount, percent }: { amount: number; percent: number }) {
  return (
    <span className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
      <Delta value={amount}>{formatSignedCurrency(amount)}</Delta>
      <span className={`num text-xs sm:text-[13px] ${TONE[directionOf(amount)]}`}>({formatSignedPercent(percent)})</span>
    </span>
  );
}

/**
 * The top of the portfolio screen: which portfolio, one oversized value, today's change, total
 * return, and the primary "Add holding" action. With no holdings yet it becomes a prompt to add
 * the first one instead of showing an empty $0.00.
 */
export default function PortfolioHero({
  portfolioNames,
  activePortfolio,
  onSelectPortfolio,
  onCreate,
  onRename,
  onDelete,
  summary,
  loading,
  hasHoldings,
  watchedCount,
  hasSimulatedPrices,
  signedIn,
  onAddHolding,
  onLoadSample,
}: PortfolioHeroProps) {
  const isEmpty = watchedCount === 0;
  const showPrompt = !hasHoldings && summary.cashBalance === 0;
  const value = formatCurrency(summary.totalPortfolioValue);
  const [dollars, cents] = value.split('.');

  const addButton = (className: string) => (
    <button type="button" onClick={onAddHolding} className={`btn btn-primary shrink-0 ${className}`}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      Add holding
    </button>
  );

  return (
    <section aria-labelledby="portfolio-heading" className="pb-4 pt-3 sm:pt-5 lg:pb-7 lg:pt-8">
      <h2 id="portfolio-heading" className="sr-only">Portfolio summary</h2>

      <div className="flex items-center justify-between gap-3">
        <PortfolioMenu
          portfolioNames={portfolioNames}
          activePortfolio={activePortfolio}
          onSelectPortfolio={onSelectPortfolio}
          onCreate={onCreate}
          onRename={onRename}
          onDelete={onDelete}
        />
        {addButton('lg:hidden')}
      </div>

      {showPrompt ? (
        <div className="mt-1 max-w-2xl lg:mt-2">
          <p className="text-[28px] font-semibold leading-[1.08] tracking-[-0.04em] text-ink sm:text-5xl">
            {isEmpty ? 'Start this portfolio.' : 'Add your first holding.'}
          </p>
          <p className="mt-2.5 text-sm leading-6 text-ink-muted sm:mt-4 sm:text-base sm:leading-7">
            {isEmpty
              ? 'Add a stock you own, or load a sample watchlist to see how StockSight works.'
              : <>
                  <span className="hidden sm:inline">You&apos;re watching {watchedCount} {watchedCount === 1 ? 'stock' : 'stocks'}. </span>
                  Add the shares you own to track your value, today&apos;s change and total return.
                  {!signedIn && <span className="hidden sm:inline"> It stays on this device unless you sign in.</span>}
                </>}
          </p>
          <div className={`mt-5 flex-wrap gap-2 ${isEmpty ? 'flex' : 'hidden lg:flex'}`}>
            {addButton('hidden lg:inline-flex')}
            {isEmpty && <button type="button" onClick={onLoadSample} className="btn btn-secondary">Load a sample watchlist</button>}
          </div>
        </div>
      ) : (
        <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-12">
          <div className="min-w-0">
            {loading ? (
              <div className="skeleton h-[1em] w-[5.2em] max-w-full text-hero" role="status" aria-label="Loading portfolio value" />
            ) : (
              <p className="hero-value text-ink" style={{ '--chars': value.length } as CSSProperties}>
                <span className="sr-only">Portfolio value </span>{dollars}<span className="text-ink-muted">.{cents}</span>
              </p>
            )}
            {hasSimulatedPrices && !loading && (
              <p className="chip mt-3 border-warn/35 text-warn" title="Live quotes are unavailable for some or all stocks, so simulated demo prices are shown">Includes simulated prices</p>
            )}
          </div>

          {loading ? (
            <div className="flex gap-8 lg:pb-1.5" aria-hidden="true">
              <div className="skeleton h-10 w-32" />
              <div className="skeleton h-10 w-32" />
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:gap-10 lg:pb-1.5">
              <Stat label="Today"><Change amount={summary.dayChange} percent={summary.dayChangePercent} /></Stat>
              <Stat label="Total return"><Change amount={summary.totalGain} percent={summary.totalGainPercent} /></Stat>
              <Stat label="Holdings" className="hidden xl:block">
                <span className="num">{summary.holdingStocks.length}</span>
                <span className="text-ink-muted"> · {summary.sectorSummary}</span>
              </Stat>
              <Stat label="Cash" className="hidden xl:block"><span className="num">{formatCurrency(summary.cashBalance)}</span></Stat>
            </dl>
          )}

          {addButton('hidden lg:ml-auto lg:mb-1 lg:inline-flex')}
        </div>
      )}
    </section>
  );
}
