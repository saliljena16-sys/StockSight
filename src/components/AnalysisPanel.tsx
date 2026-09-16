import { Activity, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { AnalysisResult } from '../utils/technicalAnalysis';

interface AnalysisPanelProps {
  analysis: AnalysisResult;
  ticker: string;
}

function getRecommendationStyle(rec: string) {
  switch (rec) {
    case 'STRONG BUY': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: TrendingUp };
    case 'BUY': return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: TrendingUp };
    case 'HOLD': return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: Minus };
    case 'SELL': return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', icon: TrendingDown };
    case 'STRONG SELL': return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: TrendingDown };
    default: return { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', icon: Activity };
  }
}

export default function AnalysisPanel({ analysis, ticker }: AnalysisPanelProps) {
  const style = getRecommendationStyle(analysis.recommendation);
  const Icon = style.icon;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-bold text-white">Technical Analysis</h2>
        <span className="text-xs text-slate-500 ml-auto">Updated in real-time</span>
      </div>

      {/* Main Recommendation */}
      <div className={`${style.bg} ${style.border} border rounded-xl p-5 mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`${style.text} p-2 rounded-lg bg-slate-900/50`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Algorithm Recommendation</p>
              <p className={`text-2xl font-bold ${style.text}`}>{analysis.recommendation}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Confidence</p>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    analysis.confidence > 70 ? 'bg-emerald-500' : 
                    analysis.confidence > 40 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${analysis.confidence}%` }}
                ></div>
              </div>
              <span className="text-white font-bold">{analysis.confidence}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <p className="text-xs text-slate-500 mb-1">50-Day SMA</p>
          <p className="text-lg font-bold text-amber-400">${analysis.sma50Current.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <p className="text-xs text-slate-500 mb-1">200-Day SMA</p>
          <p className="text-lg font-bold text-violet-400">${analysis.sma200Current.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <p className="text-xs text-slate-500 mb-1">RSI (14)</p>
          <p className={`text-lg font-bold ${
            analysis.currentRSI > 70 ? 'text-red-400' : 
            analysis.currentRSI < 30 ? 'text-emerald-400' : 'text-white'
          }`}>
            {analysis.currentRSI.toFixed(1)}
          </p>
          <p className="text-xs text-slate-500">
            {analysis.currentRSI > 70 ? 'Overbought' : analysis.currentRSI < 30 ? 'Oversold' : 'Neutral'}
          </p>
        </div>
      </div>

      {/* Signals List */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Signals Detected for {ticker}</h3>
        <div className="space-y-2">
          {analysis.signals.map((signal, index) => (
            <div 
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                signal.type === 'bullish' ? 'bg-emerald-500/5 border-emerald-500/20' :
                signal.type === 'bearish' ? 'bg-red-500/5 border-red-500/20' :
                'bg-slate-700/20 border-slate-600/20'
              }`}
            >
              <div className={`mt-0.5 ${
                signal.type === 'bullish' ? 'text-emerald-400' :
                signal.type === 'bearish' ? 'text-red-400' : 'text-slate-400'
              }`}>
                {signal.type === 'bullish' ? <TrendingUp className="w-4 h-4" /> :
                 signal.type === 'bearish' ? <TrendingDown className="w-4 h-4" /> :
                 <Minus className="w-4 h-4" />}
              </div>
              <div>
                <p className={`text-sm font-medium ${
                  signal.type === 'bullish' ? 'text-emerald-300' :
                  signal.type === 'bearish' ? 'text-red-300' : 'text-slate-300'
                }`}>{signal.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{signal.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
