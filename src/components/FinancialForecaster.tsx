import { useState } from 'react';
import { Calculator, AlertTriangle, DollarSign, TrendingUp, Target } from 'lucide-react';
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

export default function FinancialForecaster({ cagr, ticker, unavailableReason }: FinancialForecasterProps) {
  const [currentInvestment, setCurrentInvestment] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [targetAmount, setTargetAmount] = useState(1000000);

  const header = (
    <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/[.06] pb-5">
      <Calculator className="w-4 h-4 text-lime-300" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[.18em] text-[#68716a]">Scenario model</p>
        <h2 className="text-base font-semibold text-white">Time-to-target forecast · {ticker}</h2>
      </div>
      {cagr && (
        <span className="ml-auto font-mono text-xs text-[#89918b]">
          CAGR {formatPercent(cagr.rate)} · {year(cagr.startDate)}–{year(cagr.endDate)}
        </span>
      )}
    </div>
  );

  if (!cagr) {
    return (
      <div className="min-h-[540px] bg-transparent pt-1">
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
    <div className="min-h-[540px] bg-transparent pt-1">
      {header}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="mb-2 flex items-center gap-1 text-xs uppercase tracking-[.1em] text-[#7f8981]">
            <DollarSign className="w-3 h-3" /> Current Investment
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68716a] text-sm">$</span>
            <input
              type="number"
              value={currentInvestment}
              onChange={(e) => setCurrentInvestment(Math.max(0, Number(e.target.value)))}
              className="h-12 w-full rounded-[7px] border border-white/[.12] bg-black/20 pl-7 pr-3 text-base font-mono text-white focus:border-lime-300/50 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-2 flex items-center gap-1 text-xs uppercase tracking-[.1em] text-[#7f8981]">
            <TrendingUp className="w-3 h-3" /> Monthly Contribution
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68716a] text-sm">$</span>
            <input
              type="number"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Math.max(0, Number(e.target.value)))}
              className="h-12 w-full rounded-[7px] border border-white/[.12] bg-black/20 pl-7 pr-3 text-base font-mono text-white focus:border-lime-300/50 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-2 flex items-center gap-1 text-xs uppercase tracking-[.1em] text-[#7f8981]">
            <Target className="w-3 h-3" /> Target Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68716a] text-sm">$</span>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(Math.max(0, Number(e.target.value)))}
              className="h-12 w-full rounded-[7px] border border-white/[.12] bg-black/20 pl-7 pr-3 text-base font-mono text-white focus:border-lime-300/50 focus:outline-none"
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 border-y border-white/[.07] mb-6">
        <div className="py-4 pr-4 md:border-r border-white/[.07]">
          <p className="mb-1 text-xs uppercase tracking-[.1em] text-[#7f8981]">Time to target</p>
          <p className="text-base font-medium font-mono text-white">
            {projection.yearsToTarget !== null ? projection.yearsToTarget + ' years' : 'Never'}
          </p>
        </div>
        <div className="py-4 px-4 md:border-r border-white/[.07]">
          <p className="mb-1 text-xs uppercase tracking-[.1em] text-[#7f8981]">Target date</p>
          <p className="text-base font-medium font-mono text-white">
            {projection.targetDate
              ? projection.targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              : 'N/A'}
          </p>
        </div>
        <div className="py-4 px-4 md:border-r border-white/[.07]">
          <p className="mb-1 text-xs uppercase tracking-[.1em] text-[#7f8981]">Contributed by target</p>
          <p className="text-base font-medium font-mono text-[#9b8ce8]">
            {projection.monthsToTarget !== null
              ? formatCurrency(currentInvestment + monthlyContribution * projection.monthsToTarget)
              : '—'}
          </p>
        </div>
        <div className="py-4 pl-4">
          <p className="mb-1 text-xs uppercase tracking-[.1em] text-[#7f8981]">Return rate</p>
          <p className={`text-base font-medium font-mono ${cagr.rate >= 0 ? 'text-[#54d99a]' : 'text-[#f07878]'}`}>{formatPercent(cagr.rate)}</p>
        </div>
      </div>
      <WealthProjectionChart
        data={projection.projectionData}
        targetAmount={targetAmount}
        monthsToTarget={projection.monthsToTarget}
      />
      <div className="mt-5 flex items-start gap-2 border-t border-white/[.07] pt-4">
        <AlertTriangle className="w-4 h-4 text-[#e4b75c] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[#8f897b] leading-relaxed">
          <strong className="text-[#c4aa72]">Model note:</strong> This projection assumes {ticker}'s closing price keeps compounding at its
          historical rate of {formatPercent(cagr.rate)} a year, measured from {cagr.startDate} to {cagr.endDate} ({cagr.years.toFixed(1)} years).
          Price return only; dividends are excluded. Past performance does not guarantee future results. Not financial advice.
        </p>
      </div>
    </div>
  );
}
