import { useState } from 'react';
import { Calculator, AlertTriangle, DollarSign, TrendingUp, Target } from 'lucide-react';
import { calculateProjection, formatCurrency, formatPercent } from '../utils/financialProjection';
import WealthProjectionChart from './WealthProjectionChart';

interface FinancialForecasterProps {
  cagr: number;
  ticker: string;
}

export default function FinancialForecaster({ cagr, ticker }: FinancialForecasterProps) {
  const [currentInvestment, setCurrentInvestment] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [targetAmount, setTargetAmount] = useState(1000000);

  const projection = calculateProjection({
    currentInvestment,
    monthlyContribution,
    targetAmount,
    annualReturnRate: cagr,
  });

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-bold text-white">Time-to-Target Forecaster</h2>
        <span className="text-xs text-slate-500 ml-auto">Using {ticker} historical CAGR: {formatPercent(cagr)}</span>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Current Investment
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
            <input
              type="number"
              value={currentInvestment}
              onChange={(e) => setCurrentInvestment(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-900/80 border border-slate-600 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Monthly Contribution
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
            <input
              type="number"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-900/80 border border-slate-600 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1">
            <Target className="w-3 h-3" /> Target Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-900/80 border border-slate-600 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <p className="text-xs text-slate-500 mb-1">Time to Target</p>
          <p className="text-lg font-bold text-white">
            {projection.yearsToTarget !== null 
              ? `${projection.yearsToTarget} years` 
              : '∞'}
          </p>
          {projection.monthsToTarget !== null && (
            <p className="text-xs text-slate-400">{projection.monthsToTarget} months</p>
          )}
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <p className="text-xs text-slate-500 mb-1">Target Date</p>
          <p className="text-lg font-bold text-white">
            {projection.targetDate 
              ? projection.targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              : 'N/A'}
          </p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <p className="text-xs text-slate-500 mb-1">Total Contributed</p>
          <p className="text-lg font-bold text-indigo-400">
            {formatCurrency(currentInvestment + monthlyContribution * (projection.monthsToTarget || 120))}
          </p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <p className="text-xs text-slate-500 mb-1">Expected Return Rate</p>
          <p className="text-lg font-bold text-emerald-400">{formatPercent(cagr)}</p>
          <p className="text-xs text-slate-400">Annual (CAGR)</p>
        </div>
      </div>

      {/* Chart */}
      <WealthProjectionChart 
        data={projection.projectionData}
        targetAmount={targetAmount}
        monthsToTarget={projection.monthsToTarget}
      />

      {/* Disclaimer */}
      <div className="mt-4 flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-200/80 leading-relaxed">
          <strong className="text-amber-300">Disclaimer:</strong> This is a mathematical projection based on {ticker}'s historical 
          Compound Annual Growth Rate (CAGR) of {formatPercent(cagr)}. Past performance does not guarantee future results. 
          This is not financial advice. Actual returns may vary significantly. Always consult a qualified financial advisor 
          before making investment decisions.
        </p>
      </div>
    </div>
  );
}
