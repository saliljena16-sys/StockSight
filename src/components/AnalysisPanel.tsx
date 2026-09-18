import { Activity, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { AnalysisResult } from '../utils/technicalAnalysis';

interface AnalysisPanelProps {
  analysis: AnalysisResult;
  ticker: string;
}

function getRecommendationStyle(rec: string) {
  switch (rec) {
    case 'STRONG BUY': return { bg: 'bg-[#54d99a]/[.07]', border: 'border-[#54d99a]/60', text: 'text-[#54d99a]', icon: TrendingUp };
    case 'BUY': return { bg: 'bg-[#54d99a]/[.07]', border: 'border-[#54d99a]/60', text: 'text-[#54d99a]', icon: TrendingUp };
    case 'HOLD': return { bg: 'bg-[#e4b75c]/[.07]', border: 'border-[#e4b75c]/60', text: 'text-[#e4b75c]', icon: Minus };
    case 'SELL': return { bg: 'bg-[#f07878]/[.07]', border: 'border-[#f07878]/60', text: 'text-[#f07878]', icon: TrendingDown };
    case 'STRONG SELL': return { bg: 'bg-[#f07878]/[.07]', border: 'border-[#f07878]/60', text: 'text-[#f07878]', icon: TrendingDown };
    default: return { bg: 'bg-white/[.03]', border: 'border-white/20', text: 'text-[#89918b]', icon: Activity };
  }
}

export default function AnalysisPanel({ analysis, ticker }: AnalysisPanelProps) {
  const style = getRecommendationStyle(analysis.recommendation);
  const Icon = style.icon;

  return (
    <div className="min-h-[540px] bg-transparent pt-1">
      <div className="flex items-center gap-3 mb-6 border-b border-white/[.06] pb-5">
        <BarChart3 className="w-4 h-4 text-lime-300" />
        <div>
          <p className="text-xs uppercase tracking-[.18em] text-[#7f8981]">Signal desk</p>
          <h2 className="text-base font-semibold text-white">Technical analysis · {ticker}</h2>
        </div>
      </div>
      <div className={`${style.bg} border-l-2 ${style.border} mb-5 p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`${style.text} p-2 rounded-md bg-black/20`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[.14em] text-[#89918b]">Momentum signal</p>
              <p className={`mt-1 text-[26px] font-semibold ${style.text}`}>{analysis.recommendation}</p>
            </div>
          </div>
        </div>
      </div>
      <p className="mb-6 max-w-3xl text-xs leading-5 text-[#68716a]">
        Based on price trend, SMA and RSI—not company valuation or whether the share price is inexpensive.
      </p>
      <div className="mb-6 grid gap-3 rounded-[8px] border border-white/[.08] bg-black/10 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-xs font-semibold text-white">How this signal is calculated</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">SMA crossover contributes ±30 points, price versus each SMA ±15, RSI up to ±25, and 10-session momentum ±15. Scores ≥40 are Strong Buy; ≤−40 are Strong Sell.</p>
        </div>
        <div className="sm:text-right"><p className="text-[10px] uppercase tracking-[.12em] text-[var(--text-tertiary)]">Signal strength</p><p className="mt-1 font-mono text-lg text-white">{analysis.isValid ? `${analysis.confidence}%` : 'N/A'}</p></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 border-y border-white/[.07] mb-7">
        <div className="py-4 sm:pr-5 sm:border-r border-white/[.07]">
          <p className="mb-1.5 text-xs uppercase tracking-[.12em] text-[#7f8981]">50-day SMA</p>
          <p className="text-lg font-medium font-mono text-[#e4b75c]">{Number.isFinite(analysis.sma50Current) ? `$${analysis.sma50Current.toFixed(2)}` : 'N/A'}</p>
        </div>
        <div className="py-4 sm:px-5 sm:border-r border-white/[.07]">
          <p className="mb-1.5 text-xs uppercase tracking-[.12em] text-[#7f8981]">200-day SMA</p>
          <p className="text-lg font-medium font-mono text-[#9b8ce8]">{Number.isFinite(analysis.sma200Current) ? `$${analysis.sma200Current.toFixed(2)}` : 'N/A'}</p>
        </div>
        <div className="py-4 sm:pl-5">
          <p className="mb-1.5 text-xs uppercase tracking-[.12em] text-[#7f8981]">RSI · 14</p>
          <p className={`text-lg font-medium font-mono ${
            analysis.currentRSI > 70 ? 'text-[#f07878]' : analysis.currentRSI < 30 ? 'text-[#54d99a]' : 'text-white'
          }`}>
            {Number.isFinite(analysis.currentRSI) ? analysis.currentRSI.toFixed(1) : 'N/A'}
          </p>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-[.1em] text-[#89918b]">Observed signals</h3>
        <div className="divide-y divide-white/[.06]">
          {analysis.signals.map((signal, index) => (
            <div
              key={index}
              className="flex items-start gap-3 px-1 py-4"
            >
              <div className={`mt-0.5 ${
                signal.type === 'bullish' ? 'text-[#54d99a]' : signal.type === 'bearish' ? 'text-[#f07878]' : 'text-[#89918b]'
              }`}>
                {signal.type === 'bullish' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : signal.type === 'bearish' ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${
                  signal.type === 'bullish' ? 'text-[#85e6b8]' : signal.type === 'bearish' ? 'text-[#f4a0a0]' : 'text-[#a2aaa4]'
                }`}>
                  {signal.name}
                </p>
                <p className="text-xs text-[#68716a] mt-1">{signal.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
