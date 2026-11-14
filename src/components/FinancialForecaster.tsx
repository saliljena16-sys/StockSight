import { useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { calculateProjection, formatCurrency, formatPercent } from '../utils/financialProjection';
import { HistoricalCAGR, MIN_CAGR_SESSIONS } from '../utils/technicalAnalysis';
import HistoryUnavailable from './HistoryUnavailable';
import WealthProjectionChart from './WealthProjectionChart';

interface FinancialForecasterProps {
  /** Real historical growth rate, or null when there isn't enough real history to state one. */
  cagr: HistoricalCAGR | null;
  ticker: string;
  /** Why cagr is null, shown in the empty state. */
  unavailableReason?: string;
}

const year = (isoDate: string) => isoDate.slice(0, 4);

function MoneyInput({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-2 block">{label}</label>
      <div className="relative">
        <span className="num pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-dim" aria-hidden="true">$</span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
          className="field num pl-7"
        />
      </div>
    </div>
  );
}

const Result = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="border-line py-3 pr-4 md:border-r md:px-4 md:first:pl-0 md:last:border-r-0">
    <p className="eyebrow mb-1.5">{label}</p>
    <p className="num text-base font-medium text-ink">{children}</p>
  </div>
);

export default function FinancialForecaster({ cagr, ticker, unavailableReason }: FinancialForecasterProps) {
  const [currentInvestment, setCurrentInvestment] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [targetAmount, setTargetAmount] = useState(1000000);

  const header = (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <p className="eyebrow">Scenario model</p>
        <h3 className="mt-1 text-base font-semibold tracking-[-0.01em] text-ink">Time-to-target forecast · {ticker}</h3>
      </div>
      {cagr && (
        <span className="num text-xs text-ink-muted">
          CAGR {formatPercent(cagr.rate)} · {year(cagr.startDate)}–{year(cagr.endDate)}
        </span>
      )}
    </div>
  );

  if (!cagr) {
    return (
      <div>
        {header}
        <HistoryUnavailable
          title="Not enough history to forecast"
          message={`A forecast needs at least one year (${MIN_CAGR_SESSIONS} trading sessions) of real daily prices for ${ticker}. StockSight won't fill the gap with an assumed return rate.`}
          reason={unavailableReason}
        />
      </div>
    );
  }

  const projection = calculateProjection({ currentInvestment, monthlyContribution, targetAmount, annualReturnRate: cagr.rate });

  return (
    <div>
      {header}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MoneyInput id="forecast-current" label="Current investment" value={currentInvestment} onChange={setCurrentInvestment} />
        <MoneyInput id="forecast-monthly" label="Monthly contribution" value={monthlyContribution} onChange={setMonthlyContribution} />
        <MoneyInput id="forecast-target" label="Target amount" value={targetAmount} onChange={setTargetAmount} />
      </div>
      <div className="mb-5 grid grid-cols-2 border-y border-line md:grid-cols-4">
        <Result label="Time to target">{projection.yearsToTarget !== null ? projection.yearsToTarget + ' years' : 'Never'}</Result>
        <Result label="Target date">
          {projection.targetDate
            ? projection.targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : 'N/A'}
        </Result>
        <Result label="Contributed by target">
          {projection.monthsToTarget !== null
            ? formatCurrency(currentInvestment + monthlyContribution * projection.monthsToTarget)
            : '—'}
        </Result>
        <Result label="Return rate"><span className={cagr.rate >= 0 ? 'text-gain' : 'text-loss'}>{cagr.rate >= 0 ? '+' : ''}{formatPercent(cagr.rate)}</span></Result>
      </div>
      <WealthProjectionChart
        data={projection.projectionData}
        targetAmount={targetAmount}
        monthsToTarget={projection.monthsToTarget}
      />
      <div className="mt-5 flex items-start gap-2.5 border-t border-line pt-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-ink-muted">
          <strong className="font-semibold text-warn">Model note:</strong> This projection assumes {ticker}&apos;s closing price keeps compounding at its
          historical rate of {formatPercent(cagr.rate)} a year, measured from {cagr.startDate} to {cagr.endDate} ({cagr.years.toFixed(1)} years).
          Price return only; dividends are excluded. Past performance does not guarantee future results. Not financial advice.
        </p>
      </div>
    </div>
  );
}
