import { CircleDashed, Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import type { AnalysisResult, Recommendation } from '../utils/technicalAnalysis';

interface AnalysisPanelProps {
  analysis: AnalysisResult;
  ticker: string;
}

const SIGNAL_STYLE: Record<Recommendation, { label: string; box: string; text: string; Icon: LucideIcon }> = {
  'STRONG BUY': { label: 'Strong buy', box: 'border-gain bg-gain/[0.06]', text: 'text-gain', Icon: TrendingUp },
  BUY: { label: 'Buy', box: 'border-gain bg-gain/[0.06]', text: 'text-gain', Icon: TrendingUp },
  HOLD: { label: 'Hold', box: 'border-warn bg-warn/[0.06]', text: 'text-warn', Icon: Minus },
  SELL: { label: 'Sell', box: 'border-loss bg-loss/[0.06]', text: 'text-loss', Icon: TrendingDown },
  'STRONG SELL': { label: 'Strong sell', box: 'border-loss bg-loss/[0.06]', text: 'text-loss', Icon: TrendingDown },
  UNAVAILABLE: { label: 'No signal', box: 'border-line-strong bg-raised', text: 'text-ink-muted', Icon: CircleDashed },
};

const OBSERVED = {
  bullish: { Icon: TrendingUp, tone: 'text-gain' },
  bearish: { Icon: TrendingDown, tone: 'text-loss' },
  neutral: { Icon: Minus, tone: 'text-ink-muted' },
} as const;

export default function AnalysisPanel({ analysis, ticker }: AnalysisPanelProps) {
  const style = SIGNAL_STYLE[analysis.recommendation];
  const Icon = style.Icon;

  return (
    <div>
      <div className="mb-5">
        <p className="eyebrow">Signal desk</p>
        <h3 className="mt-1 text-base font-semibold tracking-[-0.01em] text-ink">Technical analysis · {ticker}</h3>
      </div>

      <div className={`mb-4 flex items-center gap-4 rounded-control border-l-2 p-5 ${style.box}`}>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line ${style.text}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow">Momentum signal</p>
          <p className={`mt-1 text-2xl font-semibold tracking-[-0.03em] ${style.text}`}>{style.label}</p>
        </div>
      </div>
      <p className="mb-5 max-w-3xl text-xs leading-5 text-ink-dim">
        Based on price trend, SMA and RSI—not company valuation or whether the share price is inexpensive.
      </p>

      <div className="mb-5 grid gap-3 rounded-control border border-line p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-xs font-semibold text-ink">How this signal is calculated</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">SMA crossover contributes ±30 points, price versus each SMA ±15, RSI up to ±25, and 10-session momentum ±15. Scores ≥40 are Strong Buy; ≤−40 are Strong Sell.</p>
        </div>
        <div className="sm:text-right">
          <p className="eyebrow">Signal strength</p>
          <p className="num mt-1 text-lg text-ink">{analysis.isValid ? `${analysis.confidence}%` : 'N/A'}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 border-y border-line sm:grid-cols-3">
        <div className="border-line py-4 sm:border-r sm:pr-5">
          <p className="eyebrow mb-1.5 flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-warn" aria-hidden="true" />50-day SMA</p>
          <p className="num text-lg font-medium text-ink">{Number.isFinite(analysis.sma50Current) ? `$${analysis.sma50Current.toFixed(2)}` : 'N/A'}</p>
        </div>
        <div className="border-line py-4 sm:border-r sm:px-5">
          <p className="eyebrow mb-1.5 flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-violet" aria-hidden="true" />200-day SMA</p>
          <p className="num text-lg font-medium text-ink">{Number.isFinite(analysis.sma200Current) ? `$${analysis.sma200Current.toFixed(2)}` : 'N/A'}</p>
        </div>
        <div className="py-4 sm:pl-5">
          <p className="eyebrow mb-1.5">RSI · 14</p>
          <p className="num text-lg font-medium text-ink">
            {Number.isFinite(analysis.currentRSI) ? analysis.currentRSI.toFixed(1) : 'N/A'}
            {Number.isFinite(analysis.currentRSI) && (analysis.currentRSI > 70 || analysis.currentRSI < 30) && (
              <span className={`ml-2 text-xs font-normal ${analysis.currentRSI > 70 ? 'text-loss' : 'text-gain'}`}>{analysis.currentRSI > 70 ? 'Overbought' : 'Oversold'}</span>
            )}
          </p>
        </div>
      </div>

      <div>
        <h4 className="eyebrow mb-1 text-ink-muted">Observed signals</h4>
        <div className="divide-y divide-line">
          {analysis.signals.map((signal, index) => {
            const { Icon: SignalIcon, tone } = OBSERVED[signal.type];
            return (
              <div key={index} className="flex items-start gap-3 py-3.5">
                <SignalIcon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden="true" />
                <div>
                  <p className={`text-sm font-medium ${tone}`}>{signal.name}</p>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">{signal.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
