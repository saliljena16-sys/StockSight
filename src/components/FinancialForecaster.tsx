import { useState } from 'react';
import { Calculator, AlertTriangle, DollarSign, TrendingUp, Target } from 'lucide-react';
import { calculateProjection, formatCurrency, formatPercent } from '../utils/financialProjection';
import WealthProjectionChart from './WealthProjectionChart';

interface FinancialForecasterProps {
  cagr: number;
  ticker: string;
  isLiveData?: boolean;
}

export default function FinancialForecaster({ cagr, ticker, isLiveData = false }: FinancialForecasterProps) {
  const [currentInvestment, setCurrentInvestment] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [targetAmount, setTargetAmount] = useState(1000000);
  const projection = calculateProjection({ currentInvestment, monthlyContribution, targetAmount, annualReturnRate: cagr });

  return (
    <div className="min-h-[540px] bg-transparent pt-1">
      <div className="flex items-center gap-3 mb-6 border-b border-white/[.06] pb-5">
        <Calculator className="w-4 h-4 text-lime-300" />
        <div>
          <p className="text-[10px] uppercase tracking-[.18em] text-[#68716a]">Scenario model</p>
          <h2 className="text-base font-semibold text-white">Time-to-target forecast · {ticker}</h2>
        </div>
        <span className="text-xs text-[#89918b] ml-auto font-mono">CAGR {formatPercent(cagr)}</span>
      </div>
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
          <p className="mb-1 text-xs uppercase tracking-[.1em] text-[#7f8981]">Contributed</p>
          <p className="text-base font-medium font-mono text-[#9b8ce8]">
            {formatCurrency(currentInvestment + monthlyContribution * (projection.monthsToTarget || 120))}
          </p>
        </div>
        <div className="py-4 pl-4">
          <p className="mb-1 text-xs uppercase tracking-[.1em] text-[#7f8981]">Return rate</p>
          <p className="text-base font-medium font-mono text-[#54d99a]">{formatPercent(cagr)}</p>
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
          <strong className="text-[#c4aa72]">Model note:</strong> This projection is based on {ticker}'s historical CAGR of{' '}
          {formatPercent(cagr)}. Past performance does not guarantee future results. Not financial advice.
        </p>
      </div>
    </div>
  );
}
